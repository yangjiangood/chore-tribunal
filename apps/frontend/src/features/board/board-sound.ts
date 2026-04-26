type AudioContextCtor = typeof AudioContext

type ToneStep = {
  frequency: number
  duration: number
  gain: number
  offset: number
  type: OscillatorType
}

let audioContext: AudioContext | null = null

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null
  }

  const contextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  return contextCtor ?? null
}

function getAudioContext() {
  const AudioCtor = getAudioContextCtor()
  if (!AudioCtor) {
    return null
  }

  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioCtor()
  }

  return audioContext
}

async function ensureAudioContextReady() {
  const context = getAudioContext()
  if (!context) {
    return null
  }

  if (context.state === 'suspended') {
    await context.resume()
  }

  return context
}

function scheduleTone(context: AudioContext, step: ToneStep) {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  const startAt = context.currentTime + step.offset
  const endAt = startAt + step.duration

  oscillator.type = step.type
  oscillator.frequency.setValueAtTime(step.frequency, startAt)

  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(step.gain, startAt + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(startAt)
  oscillator.stop(endAt + 0.02)
}

async function playSequence(steps: ToneStep[]) {
  try {
    const context = await ensureAudioContextReady()
    if (!context) {
      return
    }

    steps.forEach((step) => {
      scheduleTone(context, step)
    })
  } catch {
    // Ignore audio errors so the board interaction is never blocked.
  }
}

export function primeBoardAudio() {
  void ensureAudioContextReady()
}

export function playBoardTapSound() {
  void playSequence([
    { frequency: 620, duration: 0.08, gain: 0.35, offset: 0, type: 'triangle' },
  ])
}

export function playBoardSuccessSound() {
  void playSequence([
    { frequency: 660, duration: 0.09, gain: 0.48, offset: 0, type: 'triangle' },
    { frequency: 980, duration: 0.16, gain: 0.4, offset: 0.07, type: 'sine' },
  ])
}
