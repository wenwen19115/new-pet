//! 小智 WebSocket：带头握手；文本/二进制帧经事件回前端。
//! 单连接租约放在 Rust，WebView 只走 command。

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use futures_util::{SinkExt, StreamExt};
use http::{header::HeaderName, HeaderValue};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::mpsc;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, Message},
};

const EVENT_MESSAGE: &str = "xiaozhi-ws-message";
const EVENT_CLOSED: &str = "xiaozhi-ws-closed";
const EVENT_ERROR: &str = "xiaozhi-ws-error";

pub struct XiaozhiWsState {
    inner: Mutex<Option<ConnHandle>>,
}

impl Default for XiaozhiWsState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }
}

struct ConnHandle {
    tx: mpsc::UnboundedSender<OutMsg>,
}

enum OutMsg {
    Text(String),
    Binary(Vec<u8>),
    Close,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WsMessagePayload {
    kind: String,
    /// 文本帧原文，或二进制帧 base64
    data: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WsErrorPayload {
    message: String,
}

fn emit_error(app: &AppHandle, message: impl Into<String>) {
    let _ = app.emit(
        EVENT_ERROR,
        WsErrorPayload {
            message: message.into(),
        },
    );
}

fn clear_lease(app: &AppHandle) {
    if let Some(state) = app.try_state::<XiaozhiWsState>() {
        if let Ok(mut guard) = state.inner.lock() {
            *guard = None;
        }
    }
}

fn close_existing(state: &XiaozhiWsState) {
    if let Ok(mut guard) = state.inner.lock() {
        if let Some(handle) = guard.take() {
            let _ = handle.tx.send(OutMsg::Close);
        }
    }
}

#[tauri::command]
pub async fn xiaozhi_ws_connect(
    app: AppHandle,
    state: State<'_, XiaozhiWsState>,
    url: String,
    token: String,
    device_id: String,
    client_id: String,
) -> Result<(), String> {
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err("xiaozhi ws url empty".into());
    }
    if !(url.starts_with("ws://") || url.starts_with("wss://")) {
        return Err("xiaozhi ws url must start with ws:// or wss://".into());
    }

    close_existing(&state);

    let mut request = url
        .into_client_request()
        .map_err(|e| format!("xiaozhi ws request: {e}"))?;

    let headers = request.headers_mut();
    let bearer = if token.trim().is_empty() {
        String::new()
    } else if token.trim().to_ascii_lowercase().starts_with("bearer ") {
        token.trim().to_string()
    } else {
        format!("Bearer {}", token.trim())
    };
    if !bearer.is_empty() {
        headers.insert(
            http::header::AUTHORIZATION,
            HeaderValue::from_str(&bearer).map_err(|e| format!("auth header: {e}"))?,
        );
    }
    headers.insert(
        HeaderName::from_static("protocol-version"),
        HeaderValue::from_static("1"),
    );
    headers.insert(
        HeaderName::from_static("device-id"),
        HeaderValue::from_str(device_id.trim())
            .map_err(|e| format!("device-id header: {e}"))?,
    );
    headers.insert(
        HeaderName::from_static("client-id"),
        HeaderValue::from_str(client_id.trim())
            .map_err(|e| format!("client-id header: {e}"))?,
    );

    let (ws, _) = connect_async(request)
        .await
        .map_err(|e| format!("xiaozhi ws connect: {e}"))?;

    let (mut write, mut read) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<OutMsg>();

    {
        let mut guard = state
            .inner
            .lock()
            .map_err(|_| "xiaozhi ws state lock".to_string())?;
        *guard = Some(ConnHandle { tx });
    }

    let app_write = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let send_result = match msg {
                OutMsg::Text(t) => write.send(Message::Text(t.into())).await,
                OutMsg::Binary(b) => write.send(Message::Binary(b.into())).await,
                OutMsg::Close => {
                    let _ = write.close().await;
                    break;
                }
            };
            if let Err(err) = send_result {
                emit_error(&app_write, format!("xiaozhi ws send: {err}"));
                break;
            }
        }
        let _ = write.close().await;
    });

    let app_read = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(item) = read.next().await {
            match item {
                Ok(Message::Text(t)) => {
                    let _ = app_read.emit(
                        EVENT_MESSAGE,
                        WsMessagePayload {
                            kind: "text".into(),
                            data: t.to_string(),
                        },
                    );
                }
                Ok(Message::Binary(b)) => {
                    let _ = app_read.emit(
                        EVENT_MESSAGE,
                        WsMessagePayload {
                            kind: "binary".into(),
                            data: B64.encode(b.as_ref()),
                        },
                    );
                }
                Ok(Message::Ping(_)) | Ok(Message::Pong(_)) | Ok(Message::Frame(_)) => {}
                Ok(Message::Close(_)) => break,
                Err(err) => {
                    emit_error(&app_read, format!("xiaozhi ws read: {err}"));
                    break;
                }
            }
        }
        clear_lease(&app_read);
        let _ = app_read.emit(EVENT_CLOSED, ());
    });

    Ok(())
}

#[tauri::command]
pub fn xiaozhi_ws_send_text(state: State<'_, XiaozhiWsState>, text: String) -> Result<(), String> {
    let guard = state
        .inner
        .lock()
        .map_err(|_| "xiaozhi ws state lock".to_string())?;
    let handle = guard
        .as_ref()
        .ok_or_else(|| "xiaozhi ws not connected".to_string())?;
    handle
        .tx
        .send(OutMsg::Text(text))
        .map_err(|_| "xiaozhi ws send channel closed".to_string())
}

#[tauri::command]
pub fn xiaozhi_ws_send_binary(
    state: State<'_, XiaozhiWsState>,
    base64: String,
) -> Result<(), String> {
    let bytes = B64
        .decode(base64.trim())
        .map_err(|e| format!("xiaozhi binary base64: {e}"))?;
    let guard = state
        .inner
        .lock()
        .map_err(|_| "xiaozhi ws state lock".to_string())?;
    let handle = guard
        .as_ref()
        .ok_or_else(|| "xiaozhi ws not connected".to_string())?;
    handle
        .tx
        .send(OutMsg::Binary(bytes))
        .map_err(|_| "xiaozhi ws send channel closed".to_string())
}

#[tauri::command]
pub fn xiaozhi_ws_close(state: State<'_, XiaozhiWsState>) -> Result<(), String> {
    close_existing(&state);
    Ok(())
}
