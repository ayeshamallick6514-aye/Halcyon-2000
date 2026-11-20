/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HALCYON // 2000 — RETRO AUDIO ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Production-ready Web Audio API engine providing:
 *  - Procedural 8-bit & chiptune sound effects (slice, whoosh, sparkle, bomb, combo, tap)
 *  - Clock-accurate lookahead procedural music synthesizers ('synthwave', 'chill', 'fairycore')
 *  - Custom local file decoding & playback with seamless pause/resume and loop support
 *  - Real-time 64-bin FFT frequency analysis for visualizers
 *  - Clean node lifecycle management & garbage-free parameter scheduling
 *
 * Audio Graph Topology:
 *   [SFX Nodes]         ──┐
 *   [Procedural Track]  ──┼─> [trackGain] ──┐
 *   [File Source Node]  ──┼─> [fileGain]  ──┼─> [masterGain] ──> [analyser] ──> [ctx.destination]
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Human-friendly title mappings for procedural tracks
const TRACK_TITLES = {
  synthwave: 'Midnight Synthwave',
  chill: 'Seoul Chill R&B',
  fairycore: 'Pastel Fairycore',
};

// Track-specific musical configurations (BPM and 16-step patterns)
const TRACK_CONFIGS = {
  synthwave: {
    bpm: 110,
    bass: [36, 0, 0, 0, 36, 0, 0, 0, 39, 0, 0, 0, 41, 0, 0, 0],
    lead: [72, 0, 75, 0, 72, 0, 70, 0, 67, 0, 0, 0, 70, 0, 67, 0],
    chords: [
      [48, 51, 55, 58], // Cm7
      [53, 56, 60, 63], // Fm7
    ],
  },
  chill: {
    bpm: 78,
    bass: [48, 0, 0, 0, 0, 0, 52, 0, 55, 0, 0, 0, 0, 0, 57, 0],
    lead: [0, 0, 0, 0, 72, 0, 0, 0, 0, 0, 74, 0, 0, 0, 0, 0],
    chords: [
      [60, 64, 67, 71], // Cmaj7
      [57, 60, 64, 67], // Am7
    ],
  },
  fairycore: {
    bpm: 138,
    bass: [48, 0, 48, 0, 48, 0, 48, 0, 43, 0, 43, 0, 43, 0, 43, 0],
    arp: [72, 76, 79, 84, 72, 76, 79, 84, 72, 76, 79, 84, 72, 76, 79, 84],
    lead: [72, 0, 74, 0, 76, 0, 79, 0, 81, 0, 79, 0, 76, 0, 0, 0],
  },
};

/**
 * Complete Web Audio Engine for Pastel Slice 2000.
 * Exported as the sole class from audio.js.
 */
export class AudioEngine {
  /**
   * Constructs internal state without instantiating AudioContext
   * to comply with browser autoplay requirements.
   */
  constructor() {
    // Web Audio Core Nodes
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.trackGain = null;
    this.fileGain = null;

    // Fast reusable buffer for 64-bin FFT analysis (fftSize = 128)
    this.analyserData = new Uint8Array(64);

    // Global volume (0.0 to 1.0)
    this.volume = 0.7;

    // Procedural track engine state
    this.proceduralTrackName = '';
    this.proceduralState = null;
    this.isProceduralPaused = false;

    // User audio file playback state
    this.fileBuffer = null;
    this.fileSource = null;
    this.fileName = '';
    this.fileLoop = false;
    this.fileStartTime = 0;
    this.filePauseOffset = 0;
    this.isFilePlaying = false;
    this.isFilePaused = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & GRAPH SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Creates and resumes the AudioContext on user gesture.
   * Safe to call multiple times (idempotent).
   * @returns {Promise<AudioContext|null>}
   */
  async init() {
    try {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          await this.ctx.resume();
        }
        return this.ctx;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[AudioEngine] Web Audio API is not supported.');
        return null;
      }

      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Master Gain Node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Analyser Node (fftSize = 128 -> 64 frequency bins)
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

      // Sub-gain nodes for isolated volume and routing control
      this.trackGain = this.ctx.createGain();
      this.trackGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.fileGain = this.ctx.createGain();
      this.fileGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Graph: Sources -> Subgains -> masterGain -> analyser -> destination
      this.trackGain.connect(this.masterGain);
      this.fileGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      return this.ctx;
    } catch (err) {
      console.warn('[AudioEngine] init error:', err);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLS & GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Whether any audio (procedural music or audio file) is actively playing.
   * @type {boolean}
   */
  get isPlaying() {
    if (this.isFilePlaying) return true;
    if (Boolean(this.proceduralTrackName) && !this.isProceduralPaused) return true;
    return false;
  }

  /**
   * Title of currently active track or file, or empty string.
   * @type {string}
   */
  get currentTrackName() {
    if (this.isFilePlaying || this.isFilePaused) {
      return this.fileName || 'Audio File';
    }
    if (this.proceduralTrackName) {
      return TRACK_TITLES[this.proceduralTrackName] || this.proceduralTrackName;
    }
    return '';
  }

  /**
   * Returns a 64-element Uint8Array containing instantaneous frequency spectrum data.
   * @returns {Uint8Array}
   */
  getAnalyserData() {
    try {
      if (!this.analyser) return this.analyserData;
      this.analyser.getByteFrequencyData(this.analyserData);
      return this.analyserData;
    } catch (err) {
      console.warn('[AudioEngine] getAnalyserData error:', err);
      return this.analyserData;
    }
  }

  /**
   * Sets master volume (0.0 to 1.0).
   * @param {number} v
   */
  setVolume(v) {
    try {
      const clamped = Math.max(0, Math.min(1, Number(v) || 0));
      this.volume = clamped;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
      }
    } catch (err) {
      console.warn('[AudioEngine] setVolume error:', err);
    }
  }

  /**
   * Sets loop behavior for custom file playback.
   * @param {boolean} loop
   */
  setLoop(loop) {
    this.fileLoop = Boolean(loop);
    if (this.fileSource) {
      this.fileSource.loop = this.fileLoop;
    }
  }

  /**
   * Toggles play/pause for the current active audio stream (file or procedural track).
   * @returns {boolean} True if playing, false if paused/stopped.
   */
  togglePlayPause() {
    try {
      if (!this.ctx) return false;

      // 1. File playback active -> Pause it
      if (this.isFilePlaying && this.fileBuffer && this.fileSource) {
        const elapsed = this.ctx.currentTime - this.fileStartTime;
        const dur = this.fileBuffer.duration;
        this.filePauseOffset = this.fileLoop && dur > 0 ? (elapsed % dur) : Math.min(elapsed, dur);

        try {
          this.fileSource.onended = null;
          this.fileSource.stop();
          this.fileSource.disconnect();
        } catch (_) {}
        this.fileSource = null;
        this.isFilePlaying = false;
        this.isFilePaused = true;
        return false;
      }

      // 2. File paused -> Resume it
      if (this.isFilePaused && this.fileBuffer) {
        this._startFilePlayback(this.filePauseOffset);
        return true;
      }

      // 3. Procedural music active -> Pause it
      if (this.proceduralTrackName && !this.isProceduralPaused && this.proceduralState) {
        if (this.proceduralState.intervalId) {
          clearInterval(this.proceduralState.intervalId);
          this.proceduralState.intervalId = null;
        }
        for (const node of this.proceduralState.nodes) {
          try {
            if (node.stop) node.stop();
            node.disconnect();
          } catch (_) {}
        }
        this.proceduralState.nodes = [];
        this.isProceduralPaused = true;
        return false;
      }

      // 4. Procedural music paused -> Resume it
      if (this.proceduralTrackName && this.isProceduralPaused && this.proceduralState) {
        this.isProceduralPaused = false;
        this.proceduralState.nextNoteTime = this.ctx.currentTime + 0.05;
        this._startSchedulerLoop(this.proceduralState);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[AudioEngine] togglePlayPause error:', err);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURAL SOUND EFFECTS (SFX)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Synthesizes and plays a one-shot retro procedural sound effect.
   * @param {'slice'|'whoosh'|'sparkle'|'bomb'|'combo'|'tap'} name
   */
  playSFX(name) {
    try {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const t = this.ctx.currentTime;
      switch (name) {
        case 'slice':
          this._playSlice(t);
          break;
        case 'whoosh':
          this._playWhoosh(t);
          break;
        case 'sparkle':
          this._playSparkle(t);
          break;
        case 'bomb':
          this._playBomb(t);
          break;
        case 'combo':
          this._playCombo(t);
          break;
        case 'tap':
          this._playTap(t);
          break;
        default:
          console.warn(`[AudioEngine] Unknown SFX: ${name}`);
          break;
      }
    } catch (err) {
      console.warn('[AudioEngine] playSFX error:', err);
    }
  }

  /**
   * 'slice' — Ascending chiptune chime with shimmer detune (+7 cents).
   * 500 -> 1400 Hz exponential ramp over 0.12s. Duration: ~0.15s.
   * @private
   */
  _playSlice(t) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';
    osc2.detune.setValueAtTime(7, t);

    osc1.frequency.setValueAtTime(500, t);
    osc1.frequency.exponentialRampToValueAtTime(1400, t + 0.12);

    osc2.frequency.setValueAtTime(500, t);
    osc2.frequency.exponentialRampToValueAtTime(1400, t + 0.12);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.16);
    osc2.stop(t + 0.16);

    osc1.onended = () => {
      try {
        osc1.disconnect();
        osc2.disconnect();
        gainNode.disconnect();
      } catch (_) {}
    };
  }

  /**
   * 'whoosh' — Filtered white noise bandpass sweep (3000 -> 400 Hz).
   * Gain: 0.15 -> 0 over 0.2s.
   * @private
   */
  _playWhoosh(t) {
    const buffer = this.createNoiseBuffer(0.2);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.2);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, t);
    gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.2);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(t);
    source.stop(t + 0.21);

    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (_) {}
    };
  }

  /**
   * 'sparkle' — Delicate high sine twinkle at 2200-3200 Hz.
   * Gain: 0 -> 0.12 in 0.005s, -> 0 by 0.08s.
   * @private
   */
  _playSparkle(t) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200 + Math.random() * 1000, t);

    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.12, t + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.085);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (_) {}
    };
  }

  /**
   * 'bomb' — Sine drop (180 -> 35 Hz) + 600Hz lowpass noise rumble.
   * Total duration: 0.4s.
   * @private
   */
  _playBomb(t) {
    // Low sine drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(180, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    subGain.gain.setValueAtTime(0.3, t);
    subGain.gain.linearRampToValueAtTime(0.0001, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(t);
    subOsc.stop(t + 0.41);

    // Muffled lowpass noise rumble
    const noiseBuffer = this.createNoiseBuffer(0.3);
    if (noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, t);
      noiseGain.gain.linearRampToValueAtTime(0.0001, t + 0.3);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSource.start(t);
      noiseSource.stop(t + 0.31);

      noiseSource.onended = () => {
        try {
          noiseSource.disconnect();
          filter.disconnect();
          noiseGain.disconnect();
        } catch (_) {}
      };
    }

    subOsc.onended = () => {
      try {
        subOsc.disconnect();
        subGain.disconnect();
      } catch (_) {}
    };
  }

  /**
   * 'combo' — Ascending music box triad: C5 (523Hz), E5 (659Hz), G5 (784Hz).
   * Staggered every 0.07s.
   * @private
   */
  _playCombo(t) {
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      const noteTime = t + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(0.15, noteTime + 0.005);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.12);

      osc.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.13);

      osc.onended = () => {
        try {
          osc.disconnect();
          noteGain.disconnect();
        } catch (_) {}
      };
    });
  }

  /**
   * 'tap' — Micro UI click (sine 900 Hz, duration 0.025s).
   * @private
   */
  _playTap(t) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);

    gainNode.gain.setValueAtTime(0.08, t);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.026);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (_) {}
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURAL MUSIC SCHEDULER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Starts a looping procedural track ('synthwave', 'chill', 'fairycore').
   * @param {'synthwave'|'chill'|'fairycore'} name
   */
  async playProceduralTrack(name) {
    try {
      await this.init();
      if (!this.ctx) return;

      this.stopProceduralTrack();
      this.stopFilePlayback();

      const config = TRACK_CONFIGS[name];
      if (!config) {
        console.warn(`[AudioEngine] Unknown track: ${name}`);
        return;
      }

      this.proceduralTrackName = name;
      this.isProceduralPaused = false;

      const stepTime = 60 / config.bpm / 4; // 16th note in seconds

      const state = {
        name,
        config,
        stepTime,
        currentStep: 0,
        bar: 0,
        nextNoteTime: this.ctx.currentTime + 0.05,
        intervalId: null,
        nodes: [],
        gains: [],
      };

      this.proceduralState = state;
      this._startSchedulerLoop(state);
    } catch (err) {
      console.warn('[AudioEngine] playProceduralTrack error:', err);
    }
  }

  /**
   * Stops procedural music playback and cleanly disconnects active audio nodes.
   */
  stopProceduralTrack() {
    try {
      if (this.proceduralState) {
        if (this.proceduralState.intervalId) {
          clearInterval(this.proceduralState.intervalId);
          this.proceduralState.intervalId = null;
        }
        for (const node of this.proceduralState.nodes) {
          try {
            if (node.stop) node.stop();
            node.disconnect();
          } catch (_) {}
        }
        for (const gain of this.proceduralState.gains) {
          try {
            gain.disconnect();
          } catch (_) {}
        }
      }

      this.proceduralState = null;
      this.proceduralTrackName = '';
      this.isProceduralPaused = false;
    } catch (err) {
      console.warn('[AudioEngine] stopProceduralTrack error:', err);
    }
  }

  /**
   * Lookahead timer calling setInterval every 50ms, scheduling 100ms in advance.
   * @private
   */
  _startSchedulerLoop(state) {
    if (state.intervalId) clearInterval(state.intervalId);

    const tick = () => {
      if (!this.ctx || this.isProceduralPaused || this.proceduralState !== state) return;

      const lookahead = 0.1; // 100ms
      while (state.nextNoteTime < this.ctx.currentTime + lookahead) {
        this._scheduleStep(state.name, state.currentStep, state.bar, state.nextNoteTime, state.stepTime, state);
        state.nextNoteTime += state.stepTime;
        state.currentStep = (state.currentStep + 1) % 16;
        if (state.currentStep === 0) {
          state.bar = (state.bar + 1) % 2;
        }
      }

      // Memory cleanup for long-running sessions
      if (state.nodes.length > 200) state.nodes = state.nodes.slice(-60);
      if (state.gains.length > 200) state.gains = state.gains.slice(-60);
    };

    tick();
    state.intervalId = setInterval(tick, 50);
  }

  /**
   * Dispatches step notes to specific track generators.
   * @private
   */
  _scheduleStep(name, step, bar, time, stepTime, state) {
    if (name === 'synthwave') this._stepSynthwave(step, bar, time, stepTime, state);
    else if (name === 'chill') this._stepChill(step, bar, time, stepTime, state);
    else if (name === 'fairycore') this._stepFairycore(step, bar, time, stepTime, state);
  }

  /**
   * Midnight Synthwave: BPM 110. Saw bass (400Hz LP), Cm7/Fm7 pad, chiptune lead, 80s drums.
   * @private
   */
  _stepSynthwave(step, bar, time, stepTime, state) {
    const { bass, lead, chords } = state.config;

    // Bass: Sawtooth through 400Hz lowpass, duration 0.2s, gain 0.12
    if (bass[step] > 0) {
      this.scheduleNote(this.noteToFreq(bass[step]), time, 0.2, 'sawtooth', 0.12, 400);
    }

    // Pad: Cm7 or Fm7 chord sustained for the entire bar
    if (step === 0) {
      const barNotes = chords[bar % chords.length];
      const barDuration = 16 * stepTime;
      for (const note of barNotes) {
        this._schedulePadChord(this.noteToFreq(note), time, barDuration, 'sawtooth', 0.06, 700, 0.3, 0.2);
      }
    }

    // Lead: Square chiptune melody
    if (lead[step] > 0) {
      this.scheduleNote(this.noteToFreq(lead[step]), time, stepTime * 0.8, 'square', 0.07);
    }

    // Drums: Kick [0, 8], Snare [4, 12], Hi-Hat [even steps]
    if (step === 0 || step === 8) this._playKick(time, 150, 40, 0.1, 0.25);
    if (step === 4 || step === 12) this._playNoiseDrum(time, 0.08, 'bandpass', 1200, 0.12);
    if (step % 2 === 0) this._playNoiseDrum(time, 0.03, 'highpass', 7000, 0.06);
  }

  /**
   * Seoul Chill R&B: BPM 78. Sine bass, Cmaj7/Am7 triangle pads, vibrato lead, lo-fi drums.
   * @private
   */
  _stepChill(step, bar, time, stepTime, state) {
    const { bass, lead, chords } = state.config;

    // Bass: Smooth sine 0.3s duration, gain 0.15
    if (bass[step] > 0) {
      this.scheduleNote(this.noteToFreq(bass[step]), time, 0.3, 'sine', 0.15);
    }

    // Chords: Cmaj7 or Am7 soft triangle pads
    if (step === 0) {
      const barNotes = chords[bar % chords.length];
      const barDuration = 16 * stepTime;
      for (const note of barNotes) {
        this._schedulePadChord(this.noteToFreq(note), time, barDuration, 'triangle', 0.05, null, 0.35, 0.25);
      }
    }

    // Lead: Sine melody with gentle detuned vibrato (±10 cents at 5.5 Hz)
    if (lead[step] > 0) {
      this._scheduleVibrato(this.noteToFreq(lead[step]), time, 0.4, 0.04, 5.5, 10);
    }

    // Drums (soft): Kick [0, 8], Brush [4, 12], Rim [6, 14]
    if (step === 0 || step === 8) this._playKick(time, 90, 30, 0.12, 0.12);
    if (step === 4 || step === 12) this._playNoiseDrum(time, 0.1, 'bandpass', 2000, 0.04, 0.5);
    if (step === 6 || step === 14) this._playRim(time, 1200, 0.015, 0.06);
  }

  /**
   * Pastel 8-Bit Fairycore: BPM 138. Square bass (800Hz LP), rapid arps, bouncy lead.
   * @private
   */
  _stepFairycore(step, bar, time, stepTime, state) {
    const { bass, arp, lead } = state.config;

    // Bass: Staccato 0.1s square wave through 800Hz lowpass
    if (bass[step] > 0) {
      this.scheduleNote(this.noteToFreq(bass[step]), time, 0.1, 'square', 0.08, 800);
    }

    // Arpeggio: Rapid 16th-note cycling (0.06s duration)
    if (arp[step] > 0) {
      this.scheduleNote(this.noteToFreq(arp[step]), time, 0.06, 'square', 0.04);
    }

    // Lead: Happy 8-bit melody (0.15s duration)
    if (lead[step] > 0) {
      this.scheduleNote(this.noteToFreq(lead[step]), time, 0.15, 'square', 0.06);
    }

    // Drums (chiptune): Four-on-the-floor kick, hat on even steps, square/noise snare
    if (step % 4 === 0) this._playKick(time, 180, 50, 0.05, 0.15);
    if (step % 2 === 0) this._playNoiseDrum(time, 0.015, 'highpass', 9000, 0.05);
    if (step === 4 || step === 12) {
      this._playNoiseDrum(time, 0.04, 'bandpass', 1500, 0.1, 1.0, { freq: 200, dur: 0.02 });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNTHESIS & DRUM HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Converts MIDI note number to Hz. Formula: 440 * 2^((note - 69) / 12).
   * @param {number} note
   * @returns {number}
   */
  noteToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  /**
   * Allocates a single-channel AudioBuffer populated with white noise.
   * @param {number} duration Duration in seconds
   * @returns {AudioBuffer|null}
   */
  createNoiseBuffer(duration) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate || 44100;
    const size = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, size, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Primary synthesizer note helper. Creates oscillator + gain envelope + optional filter,
   * routes to trackGain, and registers node auto-cleanup.
   *
   * @param {number} freq Frequency in Hz
   * @param {number} startTime Start time in ctx seconds
   * @param {number} duration Duration in seconds
   * @param {OscillatorType} type 'sine'|'square'|'sawtooth'|'triangle'
   * @param {number} gain Peak amplitude
   * @param {number|null} filterFreq Optional filter cutoff frequency
   * @param {BiquadFilterType} filterType Filter type (default 'lowpass')
   * @returns {{osc: OscillatorNode, gainNode: GainNode, filter: BiquadFilterNode|null}}
   */
  scheduleNote(freq, startTime, duration, type = 'sine', gain = 0.1, filterFreq = null, filterType = 'lowpass') {
    if (!this.ctx || !this.trackGain) return null;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    let filter = null;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    const attack = Math.min(0.008, duration * 0.2);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    let output = osc;
    if (filterFreq) {
      filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, startTime);
      osc.connect(filter);
      output = filter;
    }

    output.connect(gainNode);
    gainNode.connect(this.trackGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    if (this.proceduralState) {
      this.proceduralState.nodes.push(osc);
      if (filter) this.proceduralState.nodes.push(filter);
      this.proceduralState.gains.push(gainNode);
    }

    osc.onended = () => {
      try {
        osc.disconnect();
        if (filter) filter.disconnect();
        gainNode.disconnect();
      } catch (_) {}
    };

    return { osc, gainNode, filter };
  }

  /**
   * Schedules a sustained pad note with gentle attack and release curves.
   * @private
   */
  _schedulePadChord(freq, startTime, duration, type, gain, filterFreq, attack = 0.3, release = 0.2) {
    if (!this.ctx || !this.trackGain) return;

    const osc = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    let filter = null;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    const sustainStart = startTime + attack;
    const releaseStart = Math.max(sustainStart, startTime + duration - release);

    padGain.gain.setValueAtTime(0.0001, startTime);
    padGain.gain.linearRampToValueAtTime(gain, sustainStart);
    padGain.gain.setValueAtTime(gain, releaseStart);
    padGain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

    if (filterFreq) {
      filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, startTime);
      osc.connect(filter);
      filter.connect(padGain);
    } else {
      osc.connect(padGain);
    }

    padGain.connect(this.trackGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);

    if (this.proceduralState) {
      this.proceduralState.nodes.push(osc);
      if (filter) this.proceduralState.nodes.push(filter);
      this.proceduralState.gains.push(padGain);
    }

    osc.onended = () => {
      try {
        osc.disconnect();
        if (filter) filter.disconnect();
        padGain.disconnect();
      } catch (_) {}
    };
  }

  /**
   * Schedules a lead note with pitch vibrato modulated by an LFO.
   * @private
   */
  _scheduleVibrato(freq, startTime, duration, gain, vibFreq = 5.5, vibCents = 10) {
    if (!this.ctx || !this.trackGain) return;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const noteGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(vibFreq, startTime);
    lfoGain.gain.setValueAtTime(vibCents, startTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.detune);

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(gain, startTime + 0.03);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(noteGain);
    noteGain.connect(this.trackGain);

    lfo.start(startTime);
    osc.start(startTime);
    lfo.stop(startTime + duration + 0.02);
    osc.stop(startTime + duration + 0.02);

    if (this.proceduralState) {
      this.proceduralState.nodes.push(osc, lfo);
      this.proceduralState.gains.push(noteGain, lfoGain);
    }

    osc.onended = () => {
      try {
        osc.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
        noteGain.disconnect();
      } catch (_) {}
    };
  }

  /**
   * Procedural kick: pitch drop sine wave.
   * @private
   */
  _playKick(time, startFreq, endFreq, duration, gain) {
    if (!this.ctx || !this.trackGain) return;

    const osc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    kickGain.gain.setValueAtTime(gain, time);
    kickGain.gain.linearRampToValueAtTime(0.0001, time + duration);

    osc.connect(kickGain);
    kickGain.connect(this.trackGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);

    if (this.proceduralState) {
      this.proceduralState.nodes.push(osc);
      this.proceduralState.gains.push(kickGain);
    }

    osc.onended = () => {
      try {
        osc.disconnect();
        kickGain.disconnect();
      } catch (_) {}
    };
  }

  /**
   * Procedural noise percussion (snare, hi-hat, brush).
   * @private
   */
  _playNoiseDrum(time, duration, filterType, filterFreq, gain, q = 1.0, extraSquare = null) {
    if (!this.ctx || !this.trackGain) return;

    const noiseBuffer = this.createNoiseBuffer(duration);
    if (!noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, time);
    if (q !== 1.0) filter.Q.setValueAtTime(q, time);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.linearRampToValueAtTime(0.0001, time + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.trackGain);

    source.start(time);
    source.stop(time + duration + 0.02);

    if (this.proceduralState) {
      this.proceduralState.nodes.push(source, filter);
      this.proceduralState.gains.push(gainNode);
    }

    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      } catch (_) {}
    };

    // Optional square wave body (used for chiptune fairycore snare)
    if (extraSquare) {
      const square = this.ctx.createOscillator();
      const sqGain = this.ctx.createGain();

      square.type = 'square';
      square.frequency.setValueAtTime(extraSquare.freq, time);

      sqGain.gain.setValueAtTime(gain * 0.7, time);
      sqGain.gain.linearRampToValueAtTime(0.0001, time + extraSquare.dur);

      square.connect(sqGain);
      sqGain.connect(this.trackGain);

      square.start(time);
      square.stop(time + extraSquare.dur + 0.02);

      if (this.proceduralState) {
        this.proceduralState.nodes.push(square);
        this.proceduralState.gains.push(sqGain);
      }

      square.onended = () => {
        try {
          square.disconnect();
          sqGain.disconnect();
        } catch (_) {}
      };
    }
  }

  /**
   * Procedural rim shot click.
   * @private
   */
  _playRim(time, freq, duration, gain) {
    if (!this.ctx || !this.trackGain) return;

    const osc = this.ctx.createOscillator();
    const rimGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    rimGain.gain.setValueAtTime(gain, time);
    rimGain.gain.linearRampToValueAtTime(0.0001, time + duration);

    osc.connect(rimGain);
    rimGain.connect(this.trackGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);

    if (this.proceduralState) {
      this.proceduralState.nodes.push(osc);
      this.proceduralState.gains.push(rimGain);
    }

    osc.onended = () => {
      try {
        osc.disconnect();
        rimGain.disconnect();
      } catch (_) {}
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER AUDIO FILE PLAYBACK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Decodes and plays a user-provided audio File.
   * @param {File} file
   * @returns {Promise<boolean>}
   */
  async loadAndPlayFile(file) {
    try {
      if (!file) throw new Error('No audio file provided.');

      await this.init();
      if (!this.ctx) throw new Error('AudioContext initialization failed.');

      this.stopProceduralTrack();
      this.stopFilePlayback();

      // Read file to ArrayBuffer using FileReader
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err || new Error('FileReader failed'));
        reader.readAsArrayBuffer(file);
      });

      // Decode audio data (Promise + callback fallback)
      const decodedBuffer = await new Promise((resolve, reject) => {
        const promise = this.ctx.decodeAudioData(arrayBuffer, resolve, reject);
        if (promise && typeof promise.then === 'function') {
          promise.then(resolve).catch(reject);
        }
      });

      this.fileBuffer = decodedBuffer;
      this.fileName = file.name || 'User Audio';
      this.filePauseOffset = 0;

      this._startFilePlayback(0);
      return true;
    } catch (err) {
      console.warn('[AudioEngine] loadAndPlayFile error:', err);
      return false;
    }
  }

  /**
   * Stops custom user file playback and frees active source node.
   */
  stopFilePlayback() {
    try {
      if (this.fileSource) {
        this.fileSource.onended = null;
        try {
          this.fileSource.stop();
          this.fileSource.disconnect();
        } catch (_) {}
        this.fileSource = null;
      }
      this.isFilePlaying = false;
      this.isFilePaused = false;
      this.filePauseOffset = 0;
    } catch (err) {
      console.warn('[AudioEngine] stopFilePlayback error:', err);
    }
  }

  /**
   * Internal helper: starts AudioBufferSourceNode playback at specified offset.
   * @private
   */
  _startFilePlayback(offset = 0) {
    if (!this.ctx || !this.fileBuffer || !this.fileGain) return;

    if (this.fileSource) {
      this.fileSource.onended = null;
      try {
        this.fileSource.stop();
        this.fileSource.disconnect();
      } catch (_) {}
      this.fileSource = null;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = this.fileBuffer;
    source.loop = this.fileLoop;
    source.connect(this.fileGain);

    const duration = this.fileBuffer.duration;
    const safeOffset = duration > 0 ? Math.max(0, offset % duration) : 0;

    this.fileStartTime = this.ctx.currentTime - safeOffset;
    this.fileSource = source;
    this.isFilePlaying = true;
    this.isFilePaused = false;

    source.onended = () => {
      if (this.fileSource === source && !this.fileLoop) {
        this.isFilePlaying = false;
        this.isFilePaused = false;
        this.filePauseOffset = 0;
        this.fileSource = null;
      }
    };

    source.start(0, safeOffset);
  }
}
