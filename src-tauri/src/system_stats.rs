//! Host CPU / RAM / disk / network snapshot for pet context-menu preview.
//!
//! On Windows, prefer Task Manager–style counters (see `system_stats_win`).
//! Elsewhere, fall back to sysinfo with soft-scaled disk/net activity.

use serde::Serialize;

#[cfg(windows)]
#[path = "system_stats_win.rs"]
mod system_stats_win;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    /// Global CPU utilization 0–100.
    pub cpu_percent: f32,
    /// Running memory (RAM) in-use / total 0–100.
    pub memory_percent: f32,
    /// Disk active time 0–100 (Task Manager–style on Windows).
    pub disk_percent: f32,
    /// Network utilization 0–100 (throughput / link speed on Windows).
    pub network_percent: f32,
}

#[tauri::command]
pub fn get_system_stats() -> Result<SystemStats, String> {
    #[cfg(windows)]
    {
        return system_stats_win::sample();
    }
    #[cfg(not(windows))]
    {
        fallback_sysinfo()
    }
}

#[cfg(not(windows))]
fn fallback_sysinfo() -> Result<SystemStats, String> {
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, Instant};
    use sysinfo::{Disks, Networks, System};

    const DISK_BYTES_PER_SEC_AT_100: f64 = 200_000_000.0;
    const NET_BYTES_PER_SEC_AT_100: f64 = 12_500_000.0;

    struct HostMonitor {
        system: System,
        disks: Disks,
        networks: Networks,
        last_cpu_refresh: Option<Instant>,
        last_io_at: Option<Instant>,
    }

    static MONITOR: OnceLock<Mutex<HostMonitor>> = OnceLock::new();

    fn clamp_pct(v: f64) -> f32 {
        if !v.is_finite() || v <= 0.0 {
            0.0
        } else if v >= 100.0 {
            100.0
        } else {
            v as f32
        }
    }

    fn rate_to_percent(bytes: u64, elapsed: Duration, ceiling: f64) -> f32 {
        let secs = elapsed.as_secs_f64().max(0.05);
        let per_sec = bytes as f64 / secs;
        clamp_pct((per_sec / ceiling) * 100.0)
    }

    let monitor = MONITOR.get_or_init(|| {
        Mutex::new(HostMonitor {
            system: System::new(),
            disks: Disks::new_with_refreshed_list(),
            networks: Networks::new_with_refreshed_list(),
            last_cpu_refresh: None,
            last_io_at: None,
        })
    });

    let mut guard = monitor
        .lock()
        .map_err(|_| "system stats lock poisoned".to_string())?;

    let need_prime = match guard.last_cpu_refresh {
        None => true,
        Some(t) => t.elapsed() > Duration::from_secs(3),
    };
    if need_prime {
        guard.system.refresh_cpu_usage();
        std::thread::sleep(Duration::from_millis(100));
    }

    guard.system.refresh_cpu_usage();
    guard.system.refresh_memory();
    guard.disks.refresh(true);
    guard.networks.refresh(true);
    let now = Instant::now();
    guard.last_cpu_refresh = Some(now);

    let total_mem = guard.system.total_memory().max(1);
    let mem_pct =
        clamp_pct((guard.system.used_memory() as f64 / total_mem as f64) * 100.0);

    let mut disk_bytes = 0u64;
    for disk in guard.disks.list() {
        let u = disk.usage();
        disk_bytes = disk_bytes
            .saturating_add(u.read_bytes)
            .saturating_add(u.written_bytes);
    }

    let mut net_bytes = 0u64;
    for (_name, data) in guard.networks.iter() {
        net_bytes = net_bytes
            .saturating_add(data.received())
            .saturating_add(data.transmitted());
    }

    let (disk_pct, net_pct) = match guard.last_io_at {
        Some(prev) => {
            let elapsed = now.saturating_duration_since(prev);
            (
                rate_to_percent(disk_bytes, elapsed, DISK_BYTES_PER_SEC_AT_100),
                rate_to_percent(net_bytes, elapsed, NET_BYTES_PER_SEC_AT_100),
            )
        }
        None => (0.0, 0.0),
    };
    guard.last_io_at = Some(now);

    Ok(SystemStats {
        cpu_percent: clamp_pct(guard.system.global_cpu_usage() as f64),
        memory_percent: mem_pct,
        disk_percent: disk_pct,
        network_percent: net_pct,
    })
}
