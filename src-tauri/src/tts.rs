//! Free neural TTS via Microsoft Edge Read Aloud (no API key).

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use msedge_tts::{
    tts::{client::connect, SpeechConfig},
    voice::{get_voices_list, Voice},
};
use serde::Serialize;
use std::sync::OnceLock;

static VOICE_CACHE: OnceLock<Vec<Voice>> = OnceLock::new();

fn voices() -> Result<&'static Vec<Voice>, String> {
    if let Some(v) = VOICE_CACHE.get() {
        return Ok(v);
    }
    let list = get_voices_list().map_err(|e| format!("edge voice list failed: {e}"))?;
    let _ = VOICE_CACHE.set(list);
    VOICE_CACHE
        .get()
        .ok_or_else(|| "edge voice cache missing".to_string())
}

fn find_voice(want: &str) -> Result<&'static Voice, String> {
    let list = voices()?;
    let want_l = want.to_lowercase();
    list.iter()
        .find(|v| {
            v.short_name
                .as_deref()
                .map(|s| s.eq_ignore_ascii_case(want))
                .unwrap_or(false)
                || v.name.to_lowercase().contains(&want_l)
        })
        .ok_or_else(|| format!("edge voice not found: {want}"))
}

fn mime_for_format(fmt: &str) -> &'static str {
    let f = fmt.to_lowercase();
    if f.contains("webm") {
        "audio/webm"
    } else if f.contains("ogg") {
        "audio/ogg"
    } else {
        "audio/mpeg"
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeVoiceInfo {
    pub short_name: String,
    pub friendly_name: String,
    pub locale: String,
    pub gender: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeTtsAudio {
    pub mime: String,
    pub base64: String,
}

#[tauri::command]
pub fn list_edge_tts_voices(locale_prefix: Option<String>) -> Result<Vec<EdgeVoiceInfo>, String> {
    let prefix = locale_prefix
        .unwrap_or_else(|| "zh-CN".to_string())
        .to_lowercase();
    let list = voices()?;
    let mut out: Vec<EdgeVoiceInfo> = list
        .iter()
        .filter(|v| {
            let loc = v.locale.as_deref().unwrap_or("").to_lowercase();
            if prefix.starts_with("en") {
                loc.starts_with("en")
            } else if prefix.starts_with("zh") {
                loc.starts_with("zh")
            } else {
                loc.starts_with(&prefix)
            }
        })
        .filter_map(|v| {
            let short = v.short_name.clone()?;
            if !short.to_lowercase().contains("neural") {
                return None;
            }
            Some(EdgeVoiceInfo {
                short_name: short,
                friendly_name: v
                    .friendly_name
                    .clone()
                    .unwrap_or_else(|| v.name.clone()),
                locale: v.locale.clone().unwrap_or_default(),
                gender: v.gender.clone().unwrap_or_default(),
            })
        })
        .collect();
    out.sort_by(|a, b| a.friendly_name.cmp(&b.friendly_name));
    Ok(out)
}

fn synthesize_blocking(
    text: &str,
    voice: &str,
    rate: i32,
    pitch: i32,
) -> Result<EdgeTtsAudio, String> {
    let cleaned = text.trim();
    if cleaned.is_empty() {
        return Err("empty text".into());
    }
    // Keep request small; dialogue lines are short
    let clipped: String = cleaned.chars().take(280).collect();

    let voice_def = find_voice(voice)?;
    let mut config = SpeechConfig::from(voice_def);
    config.rate = rate.clamp(-40, 40);
    config.pitch = pitch.clamp(-40, 40);
    config.volume = 0;

    let mut client = connect().map_err(|e| format!("edge tts connect failed: {e}"))?;
    let audio = client
        .synthesize(&clipped, &config)
        .map_err(|e| format!("edge tts synthesize failed: {e}"))?;
    if audio.audio_bytes.is_empty() {
        return Err("edge tts returned empty audio".into());
    }

    Ok(EdgeTtsAudio {
        mime: mime_for_format(&config.audio_format).to_string(),
        base64: B64.encode(&audio.audio_bytes),
    })
}

#[tauri::command]
pub async fn synthesize_edge_tts(
    text: String,
    voice: String,
    rate: Option<i32>,
    pitch: Option<i32>,
) -> Result<EdgeTtsAudio, String> {
    let rate = rate.unwrap_or(0);
    let pitch = pitch.unwrap_or(0);
    tauri::async_runtime::spawn_blocking(move || {
        synthesize_blocking(&text, &voice, rate, pitch)
    })
    .await
    .map_err(|e| format!("edge tts join failed: {e}"))?
}
