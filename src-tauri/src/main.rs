#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod serial;
mod system_stats;
mod tts;

use tauri::Manager;

#[tauri::command]
fn get_serial_port_details() -> Result<Vec<serial::port_info::SerialPortEntry>, String> {
    serial::port_info::list_ports_with_details()
}

fn destroy_pet_windows(app: &tauri::AppHandle) {
    for label in ["pet", "pet-bubble", "pet-menu", "pet-chat"] {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.destroy();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_serial_port_details,
            system_stats::get_system_stats,
            tts::list_edge_tts_voices,
            tts::synthesize_edge_tts,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            if let Some(main) = app.get_webview_window("main") {
                let h = handle.clone();
                main.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        destroy_pet_windows(&h);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running desktop-pet");
}
