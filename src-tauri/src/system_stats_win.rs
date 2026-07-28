//! Windows samples closer to Task Manager Performance meters.

use super::SystemStats;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use windows::core::w;
use windows::Win32::NetworkManagement::IpHelper::{
    FreeMibTable, GetIfTable2, IF_TYPE_SOFTWARE_LOOPBACK, IF_TYPE_TUNNEL, MIB_IF_ROW2,
    MIB_IF_TABLE2,
};
use windows::Win32::NetworkManagement::Ndis::IfOperStatusUp;
use windows::Win32::System::Performance::{
    PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData, PdhGetFormattedCounterValue,
    PdhOpenQueryW, PDH_FMT_COUNTERVALUE, PDH_FMT_DOUBLE, PDH_HCOUNTER, PDH_HQUERY,
};
use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

struct NetSample {
    at: Instant,
    octets: u64,
    link_bps: u64,
}

struct WinMeter {
    query: PDH_HQUERY,
    cpu: PDH_HCOUNTER,
    disk_idle: PDH_HCOUNTER,
    primed: bool,
    last_net: Option<NetSample>,
}

// PDH handles are process-local opaque pointers; we only touch them under the mutex.
unsafe impl Send for WinMeter {}

static METER: OnceLock<Mutex<WinMeter>> = OnceLock::new();

fn clamp_pct(v: f64) -> f32 {
    if !v.is_finite() || v <= 0.0 {
        0.0
    } else if v >= 100.0 {
        100.0
    } else {
        v as f32
    }
}

fn pdh_status(status: u32) -> Result<(), String> {
    if status == 0 {
        Ok(())
    } else {
        Err(format!("pdh error 0x{status:08X}"))
    }
}

fn read_counter(counter: PDH_HCOUNTER) -> Result<f64, String> {
    unsafe {
        let mut value = PDH_FMT_COUNTERVALUE::default();
        let status = PdhGetFormattedCounterValue(counter, PDH_FMT_DOUBLE, None, &mut value);
        pdh_status(status)?;
        if value.CStatus != 0 {
            return Err(format!("pdh value status 0x{:08X}", value.CStatus));
        }
        Ok(value.Anonymous.doubleValue)
    }
}

fn memory_in_use_percent() -> Result<f32, String> {
    unsafe {
        let mut info = MEMORYSTATUSEX {
            dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
            ..Default::default()
        };
        GlobalMemoryStatusEx(&mut info)
            .map_err(|e| format!("GlobalMemoryStatusEx failed: {e}"))?;
        // Task Manager "In use" ≈ TotalPhys - AvailPhys
        let total = info.ullTotalPhys.max(1) as f64;
        let used = total - info.ullAvailPhys as f64;
        Ok(clamp_pct(used / total * 100.0))
    }
}

fn is_metered_iface(row: &MIB_IF_ROW2) -> bool {
    // Bit0 = FilterInterface in MIB_IF_ROW2.InterfaceAndOperStatusFlags
    if row.InterfaceAndOperStatusFlags._bitfield & 0x01 != 0 {
        return false;
    }
    if row.OperStatus != IfOperStatusUp {
        return false;
    }
    if row.Type == IF_TYPE_SOFTWARE_LOOPBACK || row.Type == IF_TYPE_TUNNEL {
        return false;
    }
    row.ReceiveLinkSpeed > 0 || row.TransmitLinkSpeed > 0
}

fn sample_network(prev: &Option<NetSample>) -> (f32, NetSample) {
    let now = Instant::now();
    let mut octets = 0u64;
    let mut link_bps = 0u64;

    unsafe {
        let mut table: *mut MIB_IF_TABLE2 = std::ptr::null_mut();
        if GetIfTable2(&mut table).is_err() || table.is_null() {
            return (
                0.0,
                NetSample {
                    at: now,
                    octets: 0,
                    link_bps: 0,
                },
            );
        }

        let table_ref = &*table;
        let rows = std::slice::from_raw_parts(
            table_ref.Table.as_ptr(),
            table_ref.NumEntries as usize,
        );
        for row in rows {
            if !is_metered_iface(row) {
                continue;
            }
            let speed = row.ReceiveLinkSpeed.max(row.TransmitLinkSpeed);
            if speed == 0 {
                continue;
            }
            link_bps = link_bps.saturating_add(speed);
            octets = octets
                .saturating_add(row.InOctets)
                .saturating_add(row.OutOctets);
        }
        FreeMibTable(table as *const _);
    }

    let sample = NetSample {
        at: now,
        octets,
        link_bps,
    };

    let pct = match prev {
        Some(p) if p.link_bps > 0 && sample.octets >= p.octets => {
            let elapsed = sample.at.saturating_duration_since(p.at).as_secs_f64();
            if elapsed < 0.05 {
                0.0
            } else {
                let delta = (sample.octets - p.octets) as f64;
                let bits_per_sec = (delta * 8.0) / elapsed;
                let capacity = p.link_bps.min(sample.link_bps).max(1) as f64;
                clamp_pct(bits_per_sec / capacity * 100.0)
            }
        }
        _ => 0.0,
    };

    (pct, sample)
}

impl WinMeter {
    fn open() -> Result<Self, String> {
        unsafe {
            let mut query = PDH_HQUERY::default();
            pdh_status(PdhOpenQueryW(None, 0, &mut query))?;

            let mut cpu = PDH_HCOUNTER::default();
            // Prefer Task Manager Performance-style utility; fall back to processor time.
            let cpu_status = PdhAddEnglishCounterW(
                query,
                w!("\\Processor Information(_Total)\\% Processor Utility"),
                0,
                &mut cpu,
            );
            if cpu_status != 0 {
                pdh_status(PdhAddEnglishCounterW(
                    query,
                    w!("\\Processor(_Total)\\% Processor Time"),
                    0,
                    &mut cpu,
                ))
                .map_err(|e| format!("add cpu counter: {e}"))?;
            }

            let mut disk_idle = PDH_HCOUNTER::default();
            pdh_status(PdhAddEnglishCounterW(
                query,
                w!("\\PhysicalDisk(_Total)\\% Idle Time"),
                0,
                &mut disk_idle,
            ))
            .map_err(|e| format!("add disk counter: {e}"))?;

            pdh_status(PdhCollectQueryData(query))?;

            Ok(Self {
                query,
                cpu,
                disk_idle,
                primed: false,
                last_net: None,
            })
        }
    }

    fn sample(&mut self) -> Result<SystemStats, String> {
        if !self.primed {
            // PDH rate counters need a second sample.
            std::thread::sleep(Duration::from_millis(200));
            self.primed = true;
        }

        unsafe {
            pdh_status(PdhCollectQueryData(self.query))?;
        }

        let cpu = clamp_pct(read_counter(self.cpu).unwrap_or(0.0));
        let idle = read_counter(self.disk_idle).unwrap_or(100.0);
        let disk = clamp_pct(100.0 - idle);
        let mem = memory_in_use_percent()?;
        let (net, net_sample) = sample_network(&self.last_net);
        self.last_net = Some(net_sample);

        Ok(SystemStats {
            cpu_percent: cpu,
            memory_percent: mem,
            disk_percent: disk,
            network_percent: net,
        })
    }
}

impl Drop for WinMeter {
    fn drop(&mut self) {
        unsafe {
            let _ = PdhCloseQuery(self.query);
        }
    }
}

fn meter() -> Result<&'static Mutex<WinMeter>, String> {
    if let Some(m) = METER.get() {
        return Ok(m);
    }
    let created = WinMeter::open()?;
    let _ = METER.set(Mutex::new(created));
    METER
        .get()
        .ok_or_else(|| "windows meter missing".to_string())
}

pub fn sample() -> Result<SystemStats, String> {
    let mut guard = meter()?
        .lock()
        .map_err(|_| "windows meter lock poisoned".to_string())?;
    guard.sample()
}
