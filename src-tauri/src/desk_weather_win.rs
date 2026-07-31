use super::DeskWeatherSnapshot;
use std::collections::{HashSet, VecDeque};
use std::ptr;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use windows::Win32::Foundation::{HWND, LPARAM, RECT};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetForegroundWindow, GetWindow, GetWindowLongW, GetWindowRect,
    GetWindowThreadProcessId, IsIconic, IsWindowVisible, IsZoomed, GWL_EXSTYLE,
    GW_OWNER, WINDOW_EX_STYLE, WS_EX_TOOLWINDOW,
};

// 设置窗最长 10s，多留一点
const SWITCH_KEEP_MS: u64 = 30_000;
const WATCH_INTERVAL_MS: u64 = 50;

struct FocusWatch {
    self_pid: u32,
    last_key: String,
    primed: bool,
    /// 刚从本进程离开；下一次外部焦点算切窗
    saw_self: bool,
    switches_ms: VecDeque<u64>,
}

static FOCUS_WATCH: OnceLock<Mutex<FocusWatch>> = OnceLock::new();
/// stop 时 +1，旧线程退出
static WATCH_EPOCH: AtomicU64 = AtomicU64::new(0);
static SPAWNED_FOR: AtomicU64 = AtomicU64::new(u64::MAX);
/// 跨 WebView 租约：设置页与桌宠各持一份；归零才停线程
static WATCH_LEASES: AtomicU32 = AtomicU32::new(0);

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn foreground_info(self_pid: u32) -> (String, bool) {
    unsafe {
        let fg = GetForegroundWindow();
        if fg.0.is_null() {
            return (String::new(), false);
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(fg, Some(&mut pid));
        if pid == 0 || pid == self_pid {
            return (String::new(), false);
        }
        let key = format!("{:x}", fg.0 as usize);
        let immersive = if IsIconic(fg).as_bool() {
            false
        } else {
            IsZoomed(fg).as_bool() || is_roughly_fullscreen(fg)
        };
        (key, immersive)
    }
}

fn ensure_focus_watcher(self_pid: u32) {
    let _ = FOCUS_WATCH.get_or_init(|| {
        Mutex::new(FocusWatch {
            self_pid,
            last_key: String::new(),
            primed: false,
            saw_self: false,
            switches_ms: VecDeque::new(),
        })
    });
    if let Some(lock) = FOCUS_WATCH.get() {
        if let Ok(mut state) = lock.lock() {
            state.self_pid = self_pid;
        }
    }
    let epoch = WATCH_EPOCH.load(Ordering::SeqCst);
    if SPAWNED_FOR.swap(epoch, Ordering::SeqCst) != epoch {
        std::thread::Builder::new()
            .name("desk-weather-focus".into())
            .spawn(move || focus_watch_loop(epoch))
            .ok();
    }
}

fn focus_watch_loop(epoch: u64) {
    while WATCH_EPOCH.load(Ordering::SeqCst) == epoch {
        std::thread::sleep(Duration::from_millis(WATCH_INTERVAL_MS));
        if WATCH_EPOCH.load(Ordering::SeqCst) != epoch {
            break;
        }
        let Some(lock) = FOCUS_WATCH.get() else {
            continue;
        };
        let Ok(mut state) = lock.lock() else {
            continue;
        };
        let (key, _) = foreground_info(state.self_pid);
        if key.is_empty() {
            state.saw_self = true;
            continue;
        }
        if !state.primed {
            state.last_key = key;
            state.primed = true;
            state.saw_self = false;
            continue;
        }
        let changed = key != state.last_key || state.saw_self;
        if !changed {
            continue;
        }
        state.last_key = key;
        state.saw_self = false;
        let t = now_ms();
        state.switches_ms.push_back(t);
        let cut = t.saturating_sub(SWITCH_KEEP_MS);
        while state
            .switches_ms
            .front()
            .copied()
            .is_some_and(|x| x < cut)
        {
            state.switches_ms.pop_front();
        }
    }
}

fn stop_focus_watcher_inner() {
    WATCH_EPOCH.fetch_add(1, Ordering::SeqCst);
    if let Some(lock) = FOCUS_WATCH.get() {
        if let Ok(mut state) = lock.lock() {
            state.last_key.clear();
            state.primed = false;
            state.saw_self = false;
            state.switches_ms.clear();
        }
    }
}

pub fn acquire_focus_watch() {
    WATCH_LEASES.fetch_add(1, Ordering::SeqCst);
    ensure_focus_watcher(std::process::id());
}

pub fn release_focus_watch() {
    loop {
        let cur = WATCH_LEASES.load(Ordering::SeqCst);
        if cur == 0 {
            return;
        }
        if WATCH_LEASES
            .compare_exchange(cur, cur - 1, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
        {
            if cur == 1 {
                stop_focus_watcher_inner();
            }
            return;
        }
    }
}

struct EnumState {
    self_pid: u32,
    pids: HashSet<u32>,
}

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> windows::core::BOOL {
    let state = &mut *(lparam.0 as *mut EnumState);

    if !IsWindowVisible(hwnd).as_bool() {
        return windows::core::BOOL(1);
    }
    // 任务栏最小化不算
    if IsIconic(hwnd).as_bool() {
        return windows::core::BOOL(1);
    }
    let owner = GetWindow(hwnd, GW_OWNER).unwrap_or(HWND(ptr::null_mut()));
    if !owner.0.is_null() {
        return windows::core::BOOL(1);
    }
    let ex = WINDOW_EX_STYLE(GetWindowLongW(hwnd, GWL_EXSTYLE) as u32);
    if ex.contains(WS_EX_TOOLWINDOW) {
        return windows::core::BOOL(1);
    }

    let mut pid = 0u32;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    if pid == 0 || pid == state.self_pid {
        return windows::core::BOOL(1);
    }
    state.pids.insert(pid);
    windows::core::BOOL(1)
}

fn is_roughly_fullscreen(hwnd: HWND) -> bool {
    unsafe {
        let mut wr = RECT::default();
        if GetWindowRect(hwnd, &mut wr).is_err() {
            return false;
        }
        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if monitor.0.is_null() {
            return false;
        }
        let mut mi = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(monitor, &mut mi).as_bool() {
            return false;
        }
        let mr = mi.rcMonitor;
        let w = wr.right - wr.left;
        let h = wr.bottom - wr.top;
        let mw = mr.right - mr.left;
        let mh = mr.bottom - mr.top;
        if mw <= 0 || mh <= 0 {
            return false;
        }
        w >= mw - 8 && h >= mh - 8
    }
}

pub fn sample() -> Result<DeskWeatherSnapshot, String> {
    let self_pid = std::process::id();
    // 无租约不拉线程，避免设置页误采后线程常驻
    if WATCH_LEASES.load(Ordering::SeqCst) > 0 {
        ensure_focus_watcher(self_pid);
    }

    let mut state = EnumState {
        self_pid,
        pids: HashSet::new(),
    };

    unsafe {
        EnumWindows(
            Some(enum_proc),
            LPARAM(&mut state as *mut _ as isize),
        )
        .map_err(|e| format!("EnumWindows failed: {e}"))?;
    }

    let (foreground_key, foreground_immersive) = foreground_info(self_pid);

    let recent_switch_times_ms = FOCUS_WATCH
        .get()
        .and_then(|m| m.lock().ok())
        .map(|mut w| {
            let cut = now_ms().saturating_sub(SWITCH_KEEP_MS);
            while w.switches_ms.front().copied().is_some_and(|x| x < cut) {
                w.switches_ms.pop_front();
            }
            w.switches_ms.iter().copied().collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(DeskWeatherSnapshot {
        app_count: state.pids.len() as u32,
        foreground_key,
        foreground_immersive,
        recent_switch_times_ms,
    })
}
