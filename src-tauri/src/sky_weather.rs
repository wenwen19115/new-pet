//! 窗外真气象：Open-Meteo（与 desk_weather 工位传感无关）

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkyWeatherFetch {
    pub ok: bool,
    pub weather: String,
    pub source: String,
}

fn map_wmo(code: i64) -> &'static str {
    match code {
        0 => "clear",
        1 | 2 | 3 => "cloudy",
        45 | 48 => "fog-mid",
        51 | 53 | 55 | 56 | 57 => "rain-light",
        61 => "rain-light",
        63 => "rain-mid",
        65 => "rain-heavy",
        66 | 67 => "sleet",
        71 => "snow-light",
        73 => "snow-mid",
        75 | 77 => "snow-heavy",
        80 => "rain-light",
        81 => "rain-mid",
        82 => "rain-storm",
        85 => "snow-light",
        86 => "snow-heavy",
        95 => "thunder",
        96 | 99 => "hail-mid",
        _ => "cloudy",
    }
}

#[tauri::command]
pub fn fetch_open_meteo_weather(lat: f64, lon: f64) -> Result<SkyWeatherFetch, String> {
    if !lat.is_finite() || !lon.is_finite() {
        return Err("invalid coordinates".into());
    }
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=weather_code&timezone=auto"
    );
    let body = ureq::get(&url)
        .timeout(std::time::Duration::from_secs(8))
        .call()
        .map_err(|e| format!("open-meteo request failed: {e}"))?
        .into_string()
        .map_err(|e| format!("open-meteo read failed: {e}"))?;

    let v: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("open-meteo json: {e}"))?;
    let code = v
        .pointer("/current/weather_code")
        .and_then(|x| x.as_i64())
        .or_else(|| {
            v.pointer("/current/weather_code")
                .and_then(|x| x.as_f64())
                .map(|f| f as i64)
        });

    match code {
        Some(c) => Ok(SkyWeatherFetch {
            ok: true,
            weather: map_wmo(c).to_string(),
            source: "open-meteo".into(),
        }),
        None => Ok(SkyWeatherFetch {
            ok: false,
            weather: "clear".into(),
            source: "open-meteo-empty".into(),
        }),
    }
}
