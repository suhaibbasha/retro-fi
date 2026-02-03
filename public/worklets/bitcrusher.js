class BitCrusher extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'bitDepth',
        defaultValue: 12,
        minValue: 1,
        maxValue: 16,
      },
      {
        name: 'frequencyReduction',
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
      },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lastSampleValue = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const bitDepth = parameters.bitDepth;
    const frequencyReduction = parameters.frequencyReduction;

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      // If we have distinct parameter values for each channel (simplification: assume mono/stereo match usually or just take [0])
      // parameters can be a-rate (array) or k-rate (single value)
      const bitDepthValue = bitDepth.length > 1 ? bitDepth[0] : bitDepth[0]; 
      const freqReductionValue = frequencyReduction.length > 1 ? frequencyReduction[0] : frequencyReduction[0];

      const step = Math.pow(0.5, bitDepthValue); 

      for (let i = 0; i < inputChannel.length; ++i) {
        // Sample Rate Reduction (Decimation)
        this.phase += freqReductionValue;
        if (this.phase >= 1.0) {
          this.phase -= 1.0;
          
          // Bit Crushing
          // Quantize the signal
          this.lastSampleValue = step * Math.floor(inputChannel[i] / step + 0.5);
        }
        
        outputChannel[i] = this.lastSampleValue;
      }
    }

    return true;
  }
}

registerProcessor('bit-crusher', BitCrusher);
