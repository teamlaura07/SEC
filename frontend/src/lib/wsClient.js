/**
 * VanRakshak WebSocket Client
 * Connects to ws://localhost:8000/ws/incidents?role=<role>
 * Handles reconnection with exponential backoff.
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
const MAX_RETRIES = 10
const BASE_DELAY_MS = 1000

let socket = null
let retryCount = 0
let retryTimer = null
const handlers = new Map()

export function connectWS(role = '_all') {
  if (socket && socket.readyState === WebSocket.OPEN) return

  const url = `${WS_URL}/ws/incidents?role=${role}`
  try {
    socket = new WebSocket(url)

    socket.onopen = () => {
      console.log('[VR-WS] Connected')
      retryCount = 0
      _emit('_connected', {})
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        _emit(msg.type, msg)
        _emit('_any', msg)
      } catch (e) {
        console.error('[VR-WS] Parse error', e)
      }
    }

    socket.onclose = () => {
      console.warn('[VR-WS] Disconnected — retrying...')
      _emit('_disconnected', {})
      _scheduleRetry(role)
    }

    socket.onerror = (err) => {
      console.error('[VR-WS] Error', err)
    }
  } catch (err) {
    console.warn('[VR-WS] Could not initialize WebSocket:', err)
  }
}

export function disconnectWS() {
  if (retryTimer) clearTimeout(retryTimer)
  if (socket) { socket.close(); socket = null }
}

export function onWS(messageType, handler) {
  if (!handlers.has(messageType)) handlers.set(messageType, new Set())
  handlers.get(messageType).add(handler)
  return () => handlers.get(messageType)?.delete(handler)
}

export function sendWS(data) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data))
  }
}

function _emit(type, data) {
  handlers.get(type)?.forEach(fn => fn(data))
}

function _scheduleRetry(role) {
  if (retryCount >= MAX_RETRIES) { console.error('[VR-WS] Max retries reached'); return }
  const delay = BASE_DELAY_MS * Math.pow(2, retryCount)
  retryCount++
  retryTimer = setTimeout(() => connectWS(role), delay)
}

const wsClient = {
  connectWS,
  disconnectWS,
  onWS,
  sendWS,
}

export default wsClient
