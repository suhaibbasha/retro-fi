export class AudioEngine {
  private context: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private volumeAnalyser: AnalyserNode | null = null;

  // Recording
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  
  // Effects
  private lowPassFilter: BiquadFilterNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private bitCrusherNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;

  // Wow & Flutter (Warp)
  private warpDelay: DelayNode | null = null;
  private warpOsc: OscillatorNode | null = null;
  private warpGain: GainNode | null = null;

  // Reverb (Tape Delay)
  private reverbDelay: DelayNode | null = null;
  private reverbGain: GainNode | null = null; // Feedback
  private reverbMix: GainNode | null = null;  // Wet Level
  
  // Noise
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  async init() {
    if (this.context) return;
    
    this.context = new window.AudioContext();
    try {
        await this.context.audioWorklet.addModule('/worklets/bitcrusher.js');
    } catch(e) {
        console.warn("Could not load worklet", e);
    }

    this.inputNode = this.context.createGain();
    this.outputNode = this.context.createGain();

    // -- Warp (Wow & Flutter) Setup --
    this.warpDelay = this.context.createDelay();
    this.warpDelay.delayTime.value = 0.05; // 50ms base delay
    
    this.warpOsc = this.context.createOscillator();
    this.warpOsc.type = 'sine';
    this.warpOsc.frequency.value = 0.2; // Slow wobble
    
    this.warpGain = this.context.createGain();
    this.warpGain.gain.value = 0; // Depth (0 = off)

    // LFO -> Gain -> Delay.delayTime
    this.warpOsc.connect(this.warpGain);
    this.warpGain.connect(this.warpDelay.delayTime);
    this.warpOsc.start();


    // -- Reverb (Tape Delay) Setup --
    // Implements a simple feedback delay
    this.reverbDelay = this.context.createDelay();
    this.reverbDelay.delayTime.value = 0.15; // 150ms slapback
    this.reverbGain = this.context.createGain(); // Feedback amount
    this.reverbGain.gain.value = 0;
    this.reverbMix = this.context.createGain(); // Dry/Wet
    this.reverbMix.gain.value = 0; 

    // Loop: Delay -> Feedback -> Delay
    this.reverbDelay.connect(this.reverbGain);
    this.reverbGain.connect(this.reverbDelay);


    // Create Nodes
    this.lowPassFilter = this.context.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 20000; // Open

    this.highPassFilter = this.context.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 0; // Open

    try {
        this.bitCrusherNode = new AudioWorkletNode(this.context, 'bit-crusher');
    } catch (e) {
        // console.log("Worklet node creation failed");
    }
    
    this.gainNode = this.context.createGain();

    // Build Chain: 
    // Input -> WarpDelay -> HighPass -> LowPass -> BitCrusher -> (Split to Reverb) -> Gain -> Output
    
    // 1. Warp Stage
    this.inputNode.connect(this.warpDelay);
    let chain = this.warpDelay as AudioNode;

    // 2. Filters
    chain = chain.connect(this.highPassFilter).connect(this.lowPassFilter);
    
    // 3. Bitcrusher
    if (this.bitCrusherNode) {
        chain = chain.connect(this.bitCrusherNode);
    }

    // 4. Reverb Send
    // Connect chain to Reverb Delay
    chain.connect(this.reverbDelay);
    // Reverb output -> Reverb Mix -> Gain
    this.reverbDelay.connect(this.reverbMix);

    // 5. Dry Signal to Gain
    chain.connect(this.gainNode);
    // 6. Wet Signal to Gain
    this.reverbMix.connect(this.gainNode);

    this.gainNode.connect(this.outputNode);

    // Output -> Destination
    this.outputNode!.connect(this.context.destination);

    // Output -> Visual Analyser
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.outputNode!.connect(this.analyser);

    // Output -> Volume VU Meter Analyser (Small FFT for speed)
    this.volumeAnalyser = this.context.createAnalyser();
    this.volumeAnalyser.fftSize = 256;
    this.volumeAnalyser.smoothingTimeConstant = 0.3;
    this.outputNode!.connect(this.volumeAnalyser);

    // Output -> Recorder Destination
    this.mediaStreamDest = this.context.createMediaStreamDestination();
    this.outputNode!.connect(this.mediaStreamDest);

    this.createNoiseLayer();
  }

  getWaveformData(buffer: Uint8Array) {
    if (this.analyser) {
        this.analyser.getByteTimeDomainData(buffer as any);
    }
  }

  setWarp(amount: number) {
      // Amount 0-1
      if (this.warpGain && this.context) {
          // Increase depth of LFO
          this.warpGain.gain.setTargetAtTime(amount * 0.005, this.context.currentTime, 0.1); 
          // 0.005s = 5ms jitter which is A LOT for pitch wow
      }
  }

  setReverb(amount: number) {
      // Amount 0-1
      if (this.reverbMix && this.reverbGain && this.context) {
          this.reverbMix.gain.setTargetAtTime(amount, this.context.currentTime, 0.1);
          // Also increase feedback with amount for more "space"
          this.reverbGain.gain.setTargetAtTime(amount * 0.6, this.context.currentTime, 0.1);
      }
  }

  setVolume(val: number) {
    if (this.gainNode) {
        this.gainNode.gain.setTargetAtTime(val, this.context!.currentTime, 0.1);
    }
  }
  
  getVolumeData(): number {
      if (!this.volumeAnalyser) return 0;
      const data = new Uint8Array(this.volumeAnalyser.frequencyBinCount);
      this.volumeAnalyser.getByteFrequencyData(data);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / data.length);
      return rms / 255.0; // Normalize 0-1
  }

  // --- Recording Logic ---
  startRecording() {
      if (!this.mediaStreamDest) return;
      this.chunks = [];
      try {
        this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream); // Use supported mimeType if needed
      } catch (e) {
         console.error("MediaRecorder init failed", e);
         return;
      }

      this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.chunks.push(e.data);
      };
      
      this.mediaRecorder.start();
  }

  async stopRecording(): Promise<string | null> {
      if (!this.mediaRecorder) return null;
      
      return new Promise((resolve) => {
          this.mediaRecorder!.onstop = () => {
             const blob = new Blob(this.chunks, { type: 'audio/wav' }); // actually typically webm/opus
             const url = URL.createObjectURL(blob);
             resolve(url);
          };
          this.mediaRecorder!.stop();
      });
  }

  setSource(element: HTMLMediaElement) {
    if (!this.context || !this.inputNode) return;
    
    // Resume context if suspended (browser requirement)
    if (this.context.state === 'suspended') {
        this.context.resume();
    }

    try {
        if (this.sourceNode) {
            // We disconnect to be safe, though createMediaElementSource usually handles one-time binding
            // Note: Once an element is "sourced", it can't be sourced again in some browsers unless we reuse the node.
            // But we can just create a new one if it's a new element. 
            // If it's the SAME element, we should reuse the existing SourceNode or just ensure it's connected.
        }
        
        // This line throws if element already has a source node in some contexts. 
        // We'll trust the caller to manage elements, or just catch it.
        // Better pattern: store sourceNode WeakMap? For now, simple.
        this.sourceNode = this.context.createMediaElementSource(element);
        this.sourceNode.connect(this.inputNode);
    } catch (e) {
        // likely "HTMLMediaElement already connected to an AudioNode"
        // In that case, we assume it's already routed properly if we are using the same context.
        // No action needed.
        console.log("Audio Source attach:", e);
    }
  }

  setLowPass(freq: number) {
    if (this.lowPassFilter) {
        // Human hearing range log mapping could be better, but linear for now
        this.lowPassFilter.frequency.setTargetAtTime(freq, this.context!.currentTime, 0.1);
    }
  }

  setHighPass(freq: number) {
    if (this.highPassFilter) {
        this.highPassFilter.frequency.setTargetAtTime(freq, this.context!.currentTime, 0.1);
    }
  }

  setBitCrushing(depth: number, reduction: number) {
    // depth: 16 (clean) -> 1 (dirty)
    // reduction: 0 (clean) -> 1 (crushed)
    if (this.bitCrusherNode) {
        const bitDepthParam = this.bitCrusherNode.parameters.get('bitDepth');
        const freqReductionParam = this.bitCrusherNode.parameters.get('frequencyReduction');
        
        if (bitDepthParam) bitDepthParam.setTargetAtTime(depth, this.context!.currentTime, 0.1);
        if (freqReductionParam) freqReductionParam.setTargetAtTime(reduction, this.context!.currentTime, 0.1);
    }
  }

  // Noise Generation (Pink Noise approx)
  createNoiseLayer() {
    if (!this.context) return;
    const bufferSize = 2 * this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }

    this.noiseNode = this.context.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;
    
    this.noiseGain = this.context.createGain();
    this.noiseGain.gain.value = 0; // Off by default

    this.noiseNode.connect(this.noiseGain);
    this.noiseGain.connect(this.outputNode!); // Bypass filters for pure noise layer? Or through? Through is better for 'radio' effect.
    // Changing to inputNode to go through filters
    this.noiseGain.disconnect();
    this.noiseGain.connect(this.inputNode!);
    
    this.noiseNode.start();
  }

  setNoiseLevel(level: number) {
      if (this.noiseGain && this.context) {
          this.noiseGain.gain.setTargetAtTime(level * 0.1, this.context.currentTime, 0.2); // Scale down
      }
  }

  resume() {
      if (this.context && this.context.state === 'suspended') {
          this.context.resume();
      }
  }
}

export const audioEngine = new AudioEngine();
