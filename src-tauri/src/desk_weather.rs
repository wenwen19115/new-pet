use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeskWeatherSnapshot {
    /// 非最小化顶层窗按 PID 去重（不含本进程）
    pub app_count: u32,
    pub foreground_key: String,
    pub foreground_immersive: bool,
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
pub fn acquire_desk_weather_watch() -> Result<(), String> {
    #[cfg(windows)]
    {
        desk_weather_win::acquire_focus_watch();
    }
    Ok(())
}

#[tauri::command]
pub fn release_desk_weather_watch() -> Result<(), String> {
    #[cfg(windows)]
    {
        desk_weather_win::release_focus_watch();
    }
    Ok(())
}

#[cfg(windows)]
#[path = "desk_weather_win.rs"]
mod desk_weather_win;
