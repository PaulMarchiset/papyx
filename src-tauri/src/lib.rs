//! Papyx's Rust side is deliberately thin.
//!
//! Every PDF operation runs in the webview (pdf-lib and pdf.js), so the backend
//! only supplies what a web page cannot do for itself: native file dialogs,
//! reading and writing the files the user picks, and revealing a result in the
//! file manager.
//!
//! The one thing here that talks to the network is the updater, and it talks to
//! exactly one place: the release manifest on GitHub. No document, no filename
//! and no usage of any kind leaves the machine — the updater sends a plain GET
//! and reads back a version number. There is still no command that takes a URL
//! from the frontend.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init());

    // Desktop only: there is no installer to run on mobile, and the crates are
    // not in the dependency graph there (see Cargo.toml).
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .run(tauri::generate_context!())
        .expect("error while running Papyx");
}
