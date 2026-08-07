//! 无边框主窗：只调 DWM 边框色 + 暗色模式（可见标题栏走前端 ThemeTitleBar）。

use tauri::WebviewWindow;

#[cfg(windows)]
fn colorref(r: u8, g: u8, b: u8) -> u32 {
    // COLORREF：0x00BBGGRR
    (u32::from(b) << 16) | (u32::from(g) << 8) | u32::from(r)
}

#[cfg(windows)]
fn apply_dwm_border(
    hwnd_raw: *mut core::ffi::c_void,
    border: [u8; 3],
    dark: bool,
) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_USE_IMMERSIVE_DARK_MODE,
    };

    let hwnd = HWND(hwnd_raw);
    let border_c = colorref(border[0], border[1], border[2]);
    let dark_mode: i32 = if dark { 1 } else { 0 };

    unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &dark_mode as *const _ as *const _,
            std::mem::size_of_val(&dark_mode) as u32,
        )
        .map_err(|e| format!("DWMWA_USE_IMMERSIVE_DARK_MODE: {e}"))?;

        DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR,
            &border_c as *const _ as *const _,
            std::mem::size_of_val(&border_c) as u32,
        )
        .map_err(|e| format!("DWMWA_BORDER_COLOR: {e}"))?;
    }
    Ok(())
}

/// 无边框窗的边框色 / 暗色模式。非 Windows 为空操作。
#[tauri::command]
pub fn set_window_border_color(
    window: WebviewWindow,
    border: [u8; 3],
    dark: bool,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        let handle = window.hwnd().map_err(|e| e.to_string())?;
        return apply_dwm_border(handle.0, border, dark);
    }
    #[cfg(not(windows))]
    {
        let _ = (window, border, dark);
        Ok(())
    }
}
