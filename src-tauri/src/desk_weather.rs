//! Desktop weather sensors: app count / foreground / maximized|fullscreen.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeskWeatherSnapshot {
    /// 桌面非最小化顶层窗对应的进程数（不含本进程；任务栏最小化的不算）。
    pub app_count: u32,
    /// Stable-ish key for the foreground window (empty if none / self).
    pub foreground_key: String,
    /// Foreground is maximized or roughly fullscreen.
    pub foreground_immersive: bool,
    /// 近期外部切窗时间戳（unix ms），前端再按设置窗口截断。
    pub recent_switch_times_ms: Vec<u64>,
}

#[tauri::command]
pub fn get_desk_weather_snapshot() -> Result<DeskWeatherSnapshot, String> {
    #[cfg(windows)]
    {
        return desk_weather_win::sample();
    }
    #[cfg(not(windows))]
    {
        Ok(DeskWeatherSnapshot {
            app_count: 0,
            foreground_key: String::new(),
            foreground_immersive: false,
            recent_switch_times_ms: Vec::new(),
        })
    }
}

#[tauri::command]
pub fn stop_desk_weather_watch() -> Result<(), String> {
    #[cfg(windows)]
    {
        desk_weather_win::stop_focus_watcher();
    }
    Ok(())
}

#[cfg(windows)]
#[path = "desk_weather_win.rs"]
mod desk_weather_win;
