//! Papyx's Rust side is deliberately thin.
//!
//! Every PDF operation runs in the webview (pdf-lib and pdf.js), so the backend
//! only supplies what a web page cannot do for itself: native file dialogs,
//! reading and writing the files the user picks, and revealing a result in the
//! file manager. There is no HTTP client here, and no command that takes a URL
//! — the app has nothing to talk to.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Papyx");
}
