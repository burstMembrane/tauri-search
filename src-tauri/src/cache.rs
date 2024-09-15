use serde::{Deserialize, Serialize};
use std::fs::{read_to_string, write as fswrite};
use tauri::api::path::app_cache_dir;
use tauri::Config;
#[derive(Serialize, Deserialize)]
pub struct AppCache {
    pub apps: String,
}

pub fn cache_file_path() -> std::path::PathBuf {
    let cache_dir = app_cache_dir(&Config::default()).expect("Failed to get cache dir");
    cache_dir.join("apps_cache.json")
}

pub fn load_cache() -> Option<AppCache> {
    let cache_path = cache_file_path();
    if cache_path.exists() {
        let cache_content = read_to_string(cache_path).ok()?;
        serde_json::from_str(&cache_content).ok()
    } else {
        None
    }
}

pub fn save_cache(apps: &String) {
    let cache_path = cache_file_path();
    let cache = AppCache { apps: apps.clone() };
    if let Ok(cache_content) = serde_json::to_string(&cache) {
        let _ = fswrite(cache_path, cache_content); // Ignore write errors
    }
}
