// BazNova Ambient Music Generator
// Creates inspirational futuristic ambient electronic music using Web Audio API
// No external files needed - all generated programmatically

export class BazNovaMusic {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isPlaying = false
  private oscillators: OscillatorNode[] = []
  private gainNodes: GainNode[] = []
  private intervalIds: number[] = []

  // Chord progressions that feel inspirational and futuristic
  // Using frequencies for ambient pad chords (C major → F major → G major → Am)
  private readonly CHORDS = [
    [130.81, 164.81, 196.00, 261.63], // C major (C3, E3, G3, C4)
    [174.61, 220.00, 261.63, 349.23], // F major (F3, A3, C4, F4)
    [196.00, 246.94, 293.66, 392.00], // G major (G3, B3, D4, G4)
    [220.00, 261.63, 329.63, 440.00], // Am (A3, C4, E4, A4)
    [146.83, 185.00, 220.00, 293.66], // Dm (D3, F#3, A3, D4)
    [164.81, 196.00, 246.94, 329.63], // Em (E3, G3, B3, E4)
  ]

  // Arpeggio patterns (higher register, subtle)
  private readonly ARPEGGIO_NOTES = [
    523.25, 587.33, 659.25, 783.99, // C5, D5, E5, G5
    698.46, 783.99, 880.00, 1046.50, // F5, G5, A5, C6
  ]

  async start(volume = 0.50): Promise<void> {
    if (this.isPlaying) return

    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0
    this.masterGain.connect(this.ctx.destination)

    // Fade in
    this.masterGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 2)

    this.isPlaying = true

    // Start ambient pad
    this.startAmbientPad()

    // Start subtle arpeggio
    this.startArpeggio()

    // Start bass drone
    this.startBassDrone()
  }

  private startAmbientPad(): void {
    if (!this.ctx || !this.masterGain) return

    let chordIndex = 0

    const playChord = () => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return

      const chord = this.CHORDS[chordIndex % this.CHORDS.length]
      chordIndex++

      chord.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator()
        const gain = this.ctx!.createGain()
        const filter = this.ctx!.createBiquadFilter()

        // Use sine + triangle for warm pad sound
        osc.type = i % 2 === 0 ? 'sine' : 'triangle'
        osc.frequency.value = freq

        // Subtle detuning for richness
        osc.detune.value = (Math.random() - 0.5) * 10

        // Low-pass filter for warmth
        filter.type = 'lowpass'
        filter.frequency.value = 800
        filter.Q.value = 1

        // Envelope: slow attack, sustained, slow release
        const now = this.ctx!.currentTime
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.18, now + 1.5) // slow attack
        gain.gain.linearRampToValueAtTime(0.15, now + 6) // sustain
        gain.gain.linearRampToValueAtTime(0, now + 8) // release

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.masterGain!)

        osc.start(now)
        osc.stop(now + 8.5)

        this.oscillators.push(osc)
        this.gainNodes.push(gain)

        // Cleanup after stop
        osc.onended = () => {
          const oIdx = this.oscillators.indexOf(osc)
          if (oIdx > -1) this.oscillators.splice(oIdx, 1)
          const gIdx = this.gainNodes.indexOf(gain)
          if (gIdx > -1) this.gainNodes.splice(gIdx, 1)
        }
      })
    }

    // Play first chord immediately
    playChord()

    // Schedule new chord every 7 seconds
    const id = window.setInterval(() => {
      if (this.isPlaying) playChord()
    }, 7000)
    this.intervalIds.push(id)
  }

  private startArpeggio(): void {
    if (!this.ctx || !this.masterGain) return

    let noteIndex = 0
    let beatCount = 0

    const playNote = () => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return

      // Skip some notes for more organic feel
      if (beatCount % 3 === 0) {
        beatCount++
        return
      }
      beatCount++

      const freq = this.ARPEGGIO_NOTES[noteIndex % this.ARPEGGIO_NOTES.length]
      noteIndex++

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      // Sine for soft bell-like arpeggio
      osc.type = 'sine'
      osc.frequency.value = freq

      // Band-pass filter for crystalline quality
      filter.type = 'bandpass'
      filter.frequency.value = freq
      filter.Q.value = 5

      // Quick envelope
      const now = this.ctx.currentTime
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05) // quick attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5) // long decay

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain!)

      osc.start(now)
      osc.stop(now + 1.6)

      this.oscillators.push(osc)
      this.gainNodes.push(gain)

      osc.onended = () => {
        const oIdx = this.oscillators.indexOf(osc)
        if (oIdx > -1) this.oscillators.splice(oIdx, 1)
        const gIdx = this.gainNodes.indexOf(gain)
        if (gIdx > -1) this.gainNodes.splice(gIdx, 1)
      }
    }

    // Arpeggio every 500ms (moderate tempo)
    const id = window.setInterval(() => {
      if (this.isPlaying) playNote()
    }, 500)
    this.intervalIds.push(id)
  }

  private startBassDrone(): void {
    if (!this.ctx || !this.masterGain) return

    // Deep C2 bass drone
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()

    osc.type = 'sine'
    osc.frequency.value = 65.41 // C2

    // Sub-bass filter
    filter.type = 'lowpass'
    filter.frequency.value = 120
    filter.Q.value = 0.7

    // Very quiet, just adds warmth
    gain.gain.value = 0.12

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    osc.start()
    this.oscillators.push(osc)
    this.gainNodes.push(gain)

    // Second bass oscillator (slightly detuned for richness)
    const osc2 = this.ctx.createOscillator()
    const gain2 = this.ctx.createGain()

    osc2.type = 'sine'
    osc2.frequency.value = 65.41
    osc2.detune.value = 5 // slight detune

    gain2.gain.value = 0.06

    osc2.connect(filter)
    osc2.start()
    this.oscillators.push(osc2)
    this.gainNodes.push(gain2)
  }

  async stop(): Promise<void> {
    if (!this.isPlaying) return
    this.isPlaying = false

    // Clear intervals
    this.intervalIds.forEach(id => clearInterval(id))
    this.intervalIds = []

    // Fade out master gain
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1.5)

      // Wait for fade out
      await new Promise(resolve => setTimeout(resolve, 1600))
    }

    // Stop all oscillators
    this.oscillators.forEach(osc => {
      try { osc.stop() } catch {}
    })
    this.oscillators = []
    this.gainNodes = []

    // Close audio context
    if (this.ctx) {
      await this.ctx.close()
      this.ctx = null
    }

    this.masterGain = null
  }

  setVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.ctx.currentTime + 0.3
      )
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }
}
