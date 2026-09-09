//! 窗外真气象：Open-Meteo bundle（天气 + 日出日落）+ 客户端粗定位

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkyWeatherFetch {
    pub ok: bool,
    pub weather: String,
    pub source: String,
    /// ISO 本地日升（timezone=auto）；空串=未取到
    pub sunrise: String,
    /// ISO 本地日落
    pub sunset: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkyClientGeo {
    pub ok: bool,
    pub lat: f64,
    pub lon: f64,
    pub city: String,
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

fn daily_str(v: &serde_json::Value, key: &str) -> String {
    v.pointer(&format!("/daily/{key}/0"))
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string()
}

/// 一次拉天气 code + 今日日出日落（timezone=auto）
fn fetch_open_meteo_weather_blocking(lat: f64, lon: f64) -> Result<SkyWeatherFetch, String> {
    if !lat.is_finite() || !lon.is_finite() {
        return Err("invalid coordinates".into());
    }
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=1"
    );
    let body = ureq::get(&url)
        .set("User-Agent", "new-pet/1.0")
        .set("Accept", "application/json")
        .timeout(std::time::Duration::from_secs(12))
        .call()
        .map_err(|e| format!("open-meteo request failed: {e}"))?
        .into_string()
        .map_err(|e| format!("open-meteo read failed: {e}"))?;

    let v: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("open-meteo json: {e}"))?;
    let sunrise = daily_str(&v, "sunrise");
    let sunset = daily_str(&v, "sunset");
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
            sunrise,
            sunset,
        }),
        None => Ok(SkyWeatherFetch {
            ok: false,
            weather: "clear".into(),
            source: "open-meteo-empty".into(),
            sunrise,
            sunset,
        }),
    }
}

#[tauri::command]
pub async fn fetch_open_meteo_weather(lat: f64, lon: f64) -> Result<SkyWeatherFetch, String> {
    tauri::async_runtime::spawn_blocking(move || fetch_open_meteo_weather_blocking(lat, lon))
        .await
        .map_err(|e| format!("open-meteo join: {e}"))?
}

fn parse_f64(v: &serde_json::Value) -> Option<f64> {
    v.as_f64()
        .or_else(|| v.as_i64().map(|n| n as f64))
        .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
}

fn geo_from_json(body: &str, source: &str) -> Option<SkyClientGeo> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    // ipwho.is: success + latitude/longitude；geojs: latitude/longitude 字符串
    if let Some(ok) = v.get("success").and_then(|x| x.as_bool()) {
        if !ok {
            return None;
        }
    }
    let lat = v
        .get("latitude")
        .and_then(parse_f64)
        .or_else(|| v.get("lat").and_then(parse_f64))?;
    let lon = v
        .get("longitude")
        .and_then(parse_f64)
        .or_else(|| v.get("lon").and_then(parse_f64))?;
    if !lat.is_finite() || !lon.is_finite() {
        return None;
    }
    if !(-90.0..=90.0).contains(&lat) || !(-180.0..=180.0).contains(&lon) {
        return None;
    }
    let city = v
        .get("city")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    Some(SkyClientGeo {
        ok: true,
        lat,
        lon,
        city,
        source: source.into(),
    })
}

fn try_geo_url(url: &str, source: &str) -> Option<SkyClientGeo> {
    match ureq::get(url)
        .set("User-Agent", "new-pet/1.0")
        .set("Accept", "application/json")
        .timeout(std::time::Duration::from_secs(8))
        .call()
    {
        Ok(resp) => {
            let body = resp.into_string().ok()?;
            geo_from_json(&body, source)
        }
        Err(e) => {
            eprintln!("[sky-weather] geo {source} failed: {e}");
            None
        }
    }
}

/// IP 粗定位：大陆同属 Asia/Shanghai，时区分不出深圳/上海，跟随时靠这个。
fn fetch_client_geo_blocking() -> Result<SkyClientGeo, String> {
    // 多源：部分环境拦其一；无 UA 也易被拒
    if let Some(hit) = try_geo_url("https://ipwho.is/", "ipwho.is") {
        return Ok(hit);
    }
    if let Some(hit) = try_geo_url("https://get.geojs.io/v1/ip/geo.json", "geojs") {
        return Ok(hit);
    }
    // ipinfo：loc="lat,lon"
    if let Some(hit) = try_geo_ipinfo() {
        return Ok(hit);
    }
    Ok(SkyClientGeo {
        ok: false,
        lat: 0.0,
        lon: 0.0,
        city: String::new(),
        source: "geo-failed".into(),
    })
}

fn try_geo_ipinfo() -> Option<SkyClientGeo> {
    let body = ureq::get("https://ipinfo.io/json")
        .set("User-Agent", "new-pet/1.0")
        .set("Accept", "application/json")
        .timeout(std::time::Duration::from_secs(8))
        .call()
        .ok()?
        .into_string()
        .ok()?;
    let v: serde_json::Value = serde_json::from_str(&body).ok()?;
    let loc = v.get("loc").and_then(|x| x.as_str())?;
    let mut parts = loc.split(',');
    let lat: f64 = parts.next()?.trim().parse().ok()?;
    let lon: f64 = parts.next()?.trim().parse().ok()?;
    if !(-90.0..=90.0).contains(&lat) || !(-180.0..=180.0).contains(&lon) {
        return None;
    }
    let city = v
        .get("city")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    Some(SkyClientGeo {
        ok: true,
        lat,
        lon,
        city,
        source: "ipinfo".into(),
    })
}

#[tauri::command]
pub async fn fetch_client_geo() -> Result<SkyClientGeo, String> {
    tauri::async_runtime::spawn_blocking(fetch_client_geo_blocking)
        .await
        .map_err(|e| format!("geo join: {e}"))?
}
