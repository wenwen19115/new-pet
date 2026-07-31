//! Windows desk weather: EnumWindows + background focus watcher.

use super::DeskWeatherSnapshot;
use std::collections::{HashSet, VecDeque};
use std::ptr;
use std::sync::atomic::{AtomicU64, Ordering};
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

/// 切窗历史保留上限（设置里最长 10s，多留一点给探测）
const SWITCH_KEEP_MS: u64 = 30_000;
const WATCH_INTERVAL_MS: u64 = 50;

struct FocusWatch {
    self_pid: u32,
    last_key: String,
    primed: bool,
    /// 焦点刚从本进程离开过；下一次外部焦点要算切窗
    saw_self: bool,
    /// unix ms of external focus changes
    switches_ms: VecDeque<u64>,
}

static FOCUS_WATCH: OnceLock<Mutex<FocusWatch>> = OnceLock::new();
/// 停表时 +1；线程只跑自己那一代数
static WATCH_EPOCH: AtomicU64 = AtomicU64::new(0);
static SPAWNED_FOR: AtomicU64 = AtomicU64::new(u64::MAX);

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
        // 本进程（设置/桌宠）：记一下，别清 last_key
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
        // 外部窗换了，或从本程序切回某个外部窗，都算一次切窗
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

/// 停焦点线程并清空切窗历史（关工位气象 / 卸 host 时调）
pub fn stop_focus_watcher() {
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

struct EnumState {
    self_pid: u32,
    pids: HashSet<u32>,
}

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> windows::core::BOOL {
    let state = &mut *(lparam.0 as *mut EnumState);

    if !IsWindowVisible(hwnd).as_bool() {
        return windows::core::BOOL(1);
    }
    // 任务栏里挂着、已最小化的不算「桌面打开」
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
    ensure_focus_watcher(self_pid);

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
