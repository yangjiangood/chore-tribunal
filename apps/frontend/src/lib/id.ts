function fallbackRandomHex() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .slice(1)
}

export function createClientId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `${fallbackRandomHex()}${fallbackRandomHex()}-${fallbackRandomHex()}-4${fallbackRandomHex().slice(0, 3)}-a${fallbackRandomHex().slice(0, 3)}-${fallbackRandomHex()}${fallbackRandomHex()}${fallbackRandomHex()}`
}
