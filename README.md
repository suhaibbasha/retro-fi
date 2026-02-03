# Retro Lo-Fi Music Player

A fun personal website that plays music from YouTube and lets you butcher it lovingly with vintage-style audio effects.

## Features

- **YouTube Playback**: Search and play any YouTube video.
- **Vintage Effects**:
  - Low-pass & High-pass filters (cutoff knobs).
  - Bitcrushing (Decay knob) & Sample Rate Reduction.
  - Atmospheric Noise (Dust knob).
- **Presets**:
  - AM Radio
  - Cassette Tape
  - Underwater Lo-Fi
- **Retro UI**:
  - Wood grain, screws, and tactical knobs.
  - CRT flicker and noise overlay.

## Tech Stack

- React (Vite)
- Web Audio API (AudioWorklet for Bitcrusher)
- Tailwind CSS (v4)
- React YouTube

## Setup & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open the browser (usually http://localhost:5173).

4. **NOTE**: Due to browser security (CORS), the DSP effects (Filters, Bitcrush) are applied to the generated *noise* layer and *local audio*, but cannot directly process the audio stream from the YouTube IFrame. The "Vibe" is achieved through the mix of visual aesthetics, the lo-fi source selection, and the atmospheric noise layer.

## Controls

- **Power Button**: Turn on the device.
- **Play/Pause**: Control the tape.
- **Knobs**: Drag up/down to adjust voltage/frequency.
- **Presets**: Click the buttons below the deck to instantly change the vibe.
