#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod apps;
mod cache;
mod spotlight;
use apps::icon_path_to_base64;
use cache::{load_cache, save_cache};

#[tauri::command]
fn get_icon(path: String) -> String {
    icon_path_to_base64(&path).unwrap_or_default()
}

#[tauri::command]
async fn launch_app(path: String) {
    println!("Opening app at '{}'", path);
    match open::that(&path) {
        Ok(()) => println!("Opened '{}' successfully.", path),
        Err(err) => eprintln!("An error occurred when opening '{}': {}", path, err),
    }
}

#[tauri::command]
async fn get_apps() -> String {
    // Load the cache from disk if available
    if let Some(cached_data) = load_cache() {
        cached_data.apps
    } else {
        // Get apps and cache the result
        let apps = apps::get_apps();
        // filter any duplicate apps
        save_cache(&apps);
        apps
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_icon,
            get_apps,
            launch_app,
            spotlight::init_spotlight_window,
            spotlight::show_spotlight,
            spotlight::hide_spotlight,
        ])
        .manage(spotlight::State::default())
        .setup(move |app| {
            // Set activation policy to Accessory to prevent the app icon from showing on the dock
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
