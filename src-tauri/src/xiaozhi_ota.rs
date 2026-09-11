//! 小智 OTA：版本检查兼设备注册；未绑定则返回 activation.code。

use serde::Serialize;
use serde_json::json;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct XiaozhiOtaResult {
    pub ok: bool,
    pub status: u16,
    /// 原始 JSON 文本，前端解析 activation / websocket
    pub body: String,
}

fn normalize_ota_url(raw: &str) -> Result<String, String> {
    let mut url = raw.trim().to_string();
    if url.is_empty() {
        return Err("xiaozhi ota url empty".into());
    }
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("xiaozhi ota url must start with http:// or https://".into());
    }
    if !url.ends_with('/') {
        url.push('/');
    }
    Ok(url)
}

fn ota_check_blocking(
    ota_url: String,
    device_id: String,
    client_id: String,
    lang: String,
) -> Result<XiaozhiOtaResult, String> {
    let url = normalize_ota_url(&ota_url)?;
    let device_id = device_id.trim();
    let client_id = client_id.trim();
    if device_id.is_empty() || client_id.is_empty() {
        return Err("xiaozhi device/client id empty".into());
    }

    let accept_lang = if lang.to_ascii_lowercase().starts_with("en") {
        "en-US"
    } else {
        "zh-CN"
    };

    // 桌宠当软设备：Activation-Version=1（无板端序列号/HMAC）
    let payload = json!({
        "application": {
            "version": "0.1.0",
            "elf_sha256": "desktop-pet"
        },
        "board": {
            "type": "desktop-pet",
            "name": "new-pet",
            "mac": device_id
        }
    });

    let resp = ureq::post(&url)
        .set("Content-Type", "application/json")
        .set("Device-Id", device_id)
        .set("Client-Id", client_id)
        .set("User-Agent", "desktop-pet/0.1.0")
        .set("Accept-Language", accept_lang)
        .set("Activation-Version", "1")
        .timeout(std::time::Duration::from_secs(15))
        .send_json(payload)
        .map_err(|e| format!("xiaozhi ota request: {e}"))?;

    let status = resp.status();
    let body = resp
        .into_string()
        .map_err(|e| format!("xiaozhi ota read: {e}"))?;

    if !(200..300).contains(&status) {
        return Err(format!("xiaozhi ota http {status}: {body}"));
    }

    Ok(XiaozhiOtaResult {
        ok: true,
        status,
        body,
    })
}

#[tauri::command]
pub async fn xiaozhi_ota_check(
    ota_url: String,
    device_id: String,
    client_id: String,
    lang: Option<String>,
) -> Result<XiaozhiOtaResult, String> {
    let lang = lang.unwrap_or_else(|| "zh".into());
    tauri::async_runtime::spawn_blocking(move || {
        ota_check_blocking(ota_url, device_id, client_id, lang)
    })
    .await
    .map_err(|e| format!("xiaozhi ota join: {e}"))?
}
