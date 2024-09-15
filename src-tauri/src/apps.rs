use std::path::PathBuf;

use applications::common::AppInfo;
use applications::common::AppInfoContext;
use base64::engine::general_purpose;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::io::Cursor;

use icns::{IconFamily, IconType};

#[derive(Serialize, Deserialize)]
pub struct AppReference {
    name: String,
    icon: Option<PathBuf>,
    path: PathBuf,
    executable_path: Option<PathBuf>,
    icon_base64: Option<String>,
}
// turn off dead code warning
#[allow(dead_code)]
impl AppReference {
    pub fn new(
        name: String,
        icon: Option<PathBuf>,
        path: PathBuf,
        executable_path: Option<PathBuf>,
    ) -> Self {
        Self {
            name,
            icon,
            path,
            executable_path,
            icon_base64: None,
        }
    }

    pub fn default() -> Self {
        Self {
            name: "".to_string(),
            icon: None,
            path: PathBuf::new(),
            executable_path: None,
            icon_base64: None,
        }
    }

    pub fn get_icon_base64(self: &AppReference) -> Option<String> {
        let icon_path = self.icon.as_ref()?;
        let icon_path = convert_icns_to_base64(&icon_path);
        icon_path.ok()
    }

    pub fn with_icon_base64(mut self) -> Self {
        self.icon_base64 = self.get_icon_base64();
        self
    }
}

// allow dead code for now, as this will be implemented in the future
#[allow(dead_code)]
pub fn get_app_icon_base64(app: &AppReference) -> Option<String> {
    let icon_path = app.icon.as_ref()?;
    let icon_path = convert_icns_to_base64(&icon_path);
    icon_path.ok()
}

fn convert_icns_to_base64(icon_path: &PathBuf) -> Result<String, String> {
    // Attempt to open the file
    let file = File::open(icon_path).map_err(|e| format!("Failed to open icon file: {}", e))?;
    let reader = BufReader::new(file);

    // Attempt to load the icon family from the file
    let icon_family =
        IconFamily::read(reader).map_err(|e| format!("Failed to read icon family: {}", e))?;

    // Define the acceptable icon sizes in order of preference (closest to 64x64)
    let preferred_icon_types = [
        IconType::from_pixel_size(64, 64).unwrap(),
        IconType::from_pixel_size(128, 128).unwrap(),
        IconType::from_pixel_size(32, 32).unwrap(),
        IconType::RGB24_48x48,
        IconType::RGB24_32x32,
        IconType::RGB24_128x128,
    ];

    // Try to find the closest icon from the preferred list
    let icon_type = preferred_icon_types
        .iter()
        .find(|&&icon| icon_family.has_icon_with_type(icon))
        .copied()
        .or_else(|| {
            // If no preferred icon is found, fallback to the first available type
            icon_family.available_icons().first().copied()
        })
        .ok_or_else(|| "No available icons found".to_string())?;

    // Attempt to extract the icon
    let image = icon_family
        .get_icon_with_type(icon_type)
        .map_err(|e| format!("Failed to extract icon: {}", e))?;

    // Write the PNG to an in-memory buffer
    let mut buffer = Vec::new();
    {
        let mut cursor = Cursor::new(&mut buffer);
        image
            .write_png(&mut cursor)
            .map_err(|e| format!("Failed to write PNG: {}", e))?;
    }

    // Encode the buffer to Base64
    let base64_encoded_png = general_purpose::STANDARD.encode(&buffer);

    // Return the Base64 encoded string
    Ok(base64_encoded_png)
}

pub fn get_apps() -> String {
    let app_references = get_app_references();

    let app_references = filter_system_apps(&app_references);
    // deserialize all to a json array

    // filter duplicate app references
    let app_references: Vec<&AppReference> =
        app_references.iter().fold(Vec::new(), |mut acc, app| {
            if !acc.iter().any(|&x| x.name == app.name) {
                acc.push(app);
            }
            acc
        });

    // get the icon path for all the app references
    let app_references: Vec<AppReference> = app_references
        .iter()
        .map(|app| {
            let icon_path = app.icon.as_ref();
            // if the option is None, return the app reference as is
            if icon_path.is_none() {
                return AppReference {
                    name: app.name.clone(),
                    icon: app.icon.clone(),
                    path: app.path.clone(),
                    executable_path: app.executable_path.clone(),
                    icon_base64: None,
                };
            }
            let icon_path = icon_path.unwrap();
            let icon_path = convert_icns_to_base64(&icon_path);
            AppReference {
                name: app.name.clone(),
                icon: app.icon.clone(),
                path: app.path.clone(),
                executable_path: app.executable_path.clone(),
                icon_base64: icon_path.ok(),
            }
        })
        .collect();

    let json = serde_json::to_string(&app_references).unwrap();
    println!("Fetched {} apps", app_references.len());
    json
}

fn get_app_references() -> Vec<AppReference> {
    let mut ctx = AppInfoContext::new();
    ctx.refresh_apps().unwrap();
    // this will block the thread
    let apps = ctx.get_all_apps();
    let app_references: Vec<AppReference> = apps
        .iter()
        .map(|app| AppReference {
            name: app.name.clone(),
            icon: app.icon_path.clone(),
            path: app.app_desktop_path.clone(),
            executable_path: app.app_path_exe.clone(),
            icon_base64: None,
        })
        .collect();
    app_references
}

pub fn icon_path_to_base64(path: &str) -> Option<String> {
    let icon_base64 = convert_icns_to_base64(&PathBuf::from(path));
    icon_base64.ok()
}

fn filter_system_apps<'a>(apps: &'a Vec<AppReference>) -> Vec<&'a AppReference> {
    apps.iter()
        .filter(|app| {
            let path = app.path.to_str().unwrap();
            !path.contains("System")
        })
        .collect()
}
