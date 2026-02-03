import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import type { YouTubeProps } from 'react-youtube';
import { Play, Pause, Radio, CassetteTape, Upload, FastForward, Rewind, Circle } from 'lucide-react';
import { Knob } from './components/Knob';
import { audioEngine } from './audio/AudioEngine';

const YOUTUBE_OPTS: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
        autoplay: 0,
        controls: 0,
        showinfo: 0,
        modestbranding: 1,
        rel: 0
    }
};

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'radio' | 'tape'>('radio');
  
  // Effects State
  const [volume, setVolume] = useState(0.8);
  const [lowPass, setLowPass] = useState(20000); // 20kHz
  const [highPass, setHighPass] = useState(0); 
  const [bitDepth, setBitDepth] = useState(16);
  const [freqRed, setFreqRed] = useState(0); // 0 = no reduction
  const [noiseLevel, setNoiseLevel] = useState(0);
  // New Effects
  const [warpAmount, setWarpAmount] = useState(0);
  const [reverbAmount, setReverbAmount] = useState(0);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  
  // Player State
  const [videoId, setVideoId] = useState('jfKfPfyJRdk'); // lofi hip hop radio
  const playerRef = useRef<any>(null);
  
  // Tape State
  const audioRef = useRef<HTMLMediaElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("No Tape Inserted");
  const [fileType, setFileType] = useState<'audio' | 'video'>('audio');

  // Sync Audio Engine
  useEffect(() => {
    const initAudio = async () => {
      await audioEngine.init();
      // Resume on interaction if needed, but try here
      audioEngine.resume();
    };
    initAudio();
  }, []);

  useEffect(() => {
    audioEngine.setVolume(volume);
    audioEngine.setLowPass(lowPass);
    audioEngine.setHighPass(highPass);
    audioEngine.setBitCrushing(bitDepth, freqRed);
    audioEngine.setNoiseLevel(noiseLevel);
    audioEngine.setWarp(warpAmount);
    audioEngine.setReverb(reverbAmount);
  }, [volume, lowPass, highPass, bitDepth, freqRed, noiseLevel, warpAmount, reverbAmount]);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (mode === 'radio' && playerRef.current) playerRef.current.pauseVideo();
      if (mode === 'tape' && audioRef.current) audioRef.current.pause();
    } else {
      if (mode === 'radio' && playerRef.current) playerRef.current.playVideo();
      if (mode === 'tape' && audioRef.current) {
          audioEngine.setSource(audioRef.current);
          audioRef.current.play();
      }
      audioEngine.resume();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (amount: number) => {
      // Amount in seconds
      if (mode === 'radio' && playerRef.current) {
         const current = playerRef.current.getCurrentTime();
         playerRef.current.seekTo(current + amount, true);
      }
      if (mode === 'tape' && audioRef.current) {
          audioRef.current.currentTime += amount;
      }
  };

  const handleRecord = async () => {
      if (isRecording) {
          setIsRecording(false);
          const url = await audioEngine.stopRecording();
          if (url) {
            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `retro-fi-${Date.now()}.wav`;
            a.click();
          }
      } else {
          setIsRecording(true);
          audioEngine.startRecording();
      }
  };

  const switchMode = (newMode: 'radio' | 'tape') => {
      // Stop current
      setIsPlaying(false);
      try { if (playerRef.current) playerRef.current.pauseVideo(); } catch (e) {}
      if (audioRef.current) audioRef.current.pause();
      setMode(newMode);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setFileUrl(url);
          setFileName(file.name);
          setFileType(file.type.startsWith('video') ? 'video' : 'audio');
          switchMode('tape');
      }
  };

  const loadPreset = (name: string) => {
    switch (name) {
      case 'radio': // AM Radio
        setLowPass(3500);
        setHighPass(400);
        setBitDepth(12);
        setFreqRed(0.8);
        setNoiseLevel(0.4);
        setWarpAmount(0.1);
        setReverbAmount(0);
        break;
      case 'cassette': // Old Tape
        setLowPass(12000);
        setHighPass(100);
        setBitDepth(16);
        setFreqRed(1.0); 
        setNoiseLevel(0.2);
        setWarpAmount(0.4); // Flutter
        setReverbAmount(0.1);
        break;
      case 'lofi': // Underwater / Muffled
        setLowPass(800);
        setHighPass(0);
        setBitDepth(10);
        setFreqRed(0.5); 
        setNoiseLevel(0.3);
        setWarpAmount(0.6); // Heavy Warp
        setReverbAmount(0.4);
        break;
      case 'clean': // Reset
        setLowPass(20000);
        setHighPass(0);
        setBitDepth(16);
        setFreqRed(1.0); 
        setNoiseLevel(0);
        setWarpAmount(0);
        setReverbAmount(0);
        break;
      case 'telephone': // Mid-range only
        setLowPass(3000);
        setHighPass(500);
        setBitDepth(8);
        setFreqRed(0.9);
        setNoiseLevel(0.4);
        setWarpAmount(0);
        setReverbAmount(0);
        break;
      case '8bit': // Arcade / Chiptune
        setLowPass(18000);
        setHighPass(0);
        setBitDepth(4);
        setFreqRed(0.3); // Low sample rate for aliasing
        setNoiseLevel(0.1);
        setWarpAmount(0);
        setReverbAmount(0);
        break;
      case 'vhs': // Warm & Soft
        setLowPass(6000);
        setHighPass(30);
        setBitDepth(14);
        setFreqRed(1.0);
        setNoiseLevel(0.25);
        setWarpAmount(0.5);
        setReverbAmount(0.1);
        break;
      case 'broken': // Extreme Warp
        setLowPass(3000);
        setHighPass(200);
        setBitDepth(12);
        setFreqRed(0.8);
        setNoiseLevel(0.4);
        setWarpAmount(0.95);
        setReverbAmount(0);
        break;
      case 'dungeon': // Dark Reverb
        setLowPass(1500);
        setHighPass(50);
        setBitDepth(8);
        setFreqRed(0.6);
        setNoiseLevel(0.3);
        setWarpAmount(0.2);
        setReverbAmount(0.7);
        break;
      case 'ethereal': // Spacey
        setLowPass(18000);
        setHighPass(200);
        setBitDepth(16);
        setFreqRed(1.0);
        setNoiseLevel(0.05);
        setWarpAmount(0.2);
        setReverbAmount(0.8);
        break;
    }
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    // Connect audio if possible? No, CORS.
    // However, we can use the noise layer.
    // Set initial volume
    event.target.setVolume(100);
  };
  
  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
      // 1 = playing, 2 = paused
      if (event.data === 1) setIsPlaying(true);
      if (event.data === 2) setIsPlaying(false);
  };

  return (
    <>
      <div className="noise-overlay pointer-events-none"></div>
      
      {/* Container */}
      <div className="min-h-screen flex items-center justify-center p-8 bg-neutral-900">
        
        {/* Device Chassis (Hi-Fi STACK) */}
        <div className={`device-case w-[960px] p-6 flex flex-col gap-6 transition-all duration-1000 scale-[1.01]`}>
          
          {/* --- TOP SECTION: DISPLAY & SOURCE --- */}
          <div className="flex gap-4 h-[320px]">
            
            {/* The Main Display Window */}
            <div className="tape-display flex-1 relative group bg-black">
               {/* Screen Content */}
               <div className={`w-full h-full relative overflow-hidden crt-flicker`}>
                 
                 {/* Tape Mode View */}
                 {mode === 'tape' && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                        {fileType === 'audio' ? (
                            <div className="relative">
                                {/* Spools */}
                                <div className="flex gap-8 mb-4">
                                     <div className={`w-24 h-24 rounded-full border-4 border-zinc-700 bg-zinc-800 flex items-center justify-center ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                         <div className="w-20 h-20 rounded-full border-2 border-zinc-600 border-dashed"></div>
                                     </div>
                                     <div className={`w-24 h-24 rounded-full border-4 border-zinc-700 bg-zinc-800 flex items-center justify-center ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                         <div className="w-20 h-20 rounded-full border-2 border-zinc-600 border-dashed"></div>
                                     </div>
                                </div>
                                {/* Cassette Body Graphic Overlay could go here */}
                                <div className="text-center font-mono text-amber-500 text-sm tracking-widest uppercase mt-4 bg-black/50 px-4 py-1 rounded border border-amber-900/30">
                                    {fileName || "NO TAPE"}
                                </div>
                                <audio ref={audioRef as any} src={fileUrl || undefined} loop onEnded={() => setIsPlaying(false)} />
                            </div>
                        ) : (
                            <video 
                                ref={audioRef as any}
                                src={fileUrl || undefined} 
                                className="w-full h-full object-contain bg-black"
                                loop
                                onEnded={() => setIsPlaying(false)}
                                playsInline
                            />
                        )}
                        
                        {/* Eject Button (Overlay) */}
                        <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                             <label className="retro-btn px-4 py-2 cursor-pointer flex items-center gap-2 text-xs">
                                <Upload size={14} /> LOAD TAPE/VHS
                                <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                     </div>
                 )}

                 {/* Radio Mode View (YouTube) */}
                 <div className={`absolute inset-0 bg-black ${mode === 'tape' ? 'hidden' : ''}`}>
                     <YouTube
                        videoId={videoId}
                        opts={YOUTUBE_OPTS}
                        onReady={onPlayerReady}
                        onStateChange={onStateChange}
                        className="w-full h-full"
                        iframeClassName="w-full h-full object-cover opacity-80"
                     />
                     {/* Channel Tuner Overlay */}
                     <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 p-2 rounded border border-zinc-700">
                         <input 
                            type="text" 
                            placeholder="Enter YouTube ID..." 
                            className="bg-transparent border-b border-zinc-500 text-amber-500 w-40 px-2 py-1 outline-none text-xs font-mono uppercase"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setVideoId(e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                         />
                     </div>
                 </div>

                 {/* CRT Scanlines Overlay */}
                 <div className="scanlines absolute inset-0 z-20 pointer-events-none"></div>
                 
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-black/60 pointer-events-none z-30"></div>
               </div>
            </div>

            {/* Right Side: Meters & Mode */}
            <div className="w-64 flex flex-col gap-4">
                
                {/* Branding Plate */}
                <div className="bg-zinc-800 p-4 rounded border border-zinc-900 shadow-inner flex flex-col items-center justify-center h-24">
                     <h1 className="font-display text-4xl text-neutral-300 tracking-tighter" style={{ textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>RETRO-Fi 5000</h1>
                </div>

                {/* Mode Selector */}
                <div className="module-panel p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="text-[10px] text-zinc-500 mb-2 font-bold tracking-widest uppercase text-center">Source Select</div>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => switchMode('radio')}
                                className={`retro-btn py-3 flex items-center justify-center gap-2 ${mode === 'radio' ? 'active' : ''}`}
                            >
                                <Radio size={16} /> Radio
                            </button>
                            <button 
                                onClick={() => switchMode('tape')}
                                className={`retro-btn py-3 flex items-center justify-center gap-2 ${mode === 'tape' ? 'active' : ''}`}
                            >
                                <CassetteTape size={16} /> Tape
                            </button>
                        </div>
                    </div>

                     {/* Power Switch Removed */}
                     <div className="flex flex-col items-center gap-2 mt-4 opacity-50">
                        <div className="led on"></div>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase">Power ON</span>
                    </div>
                </div>
            </div>
          </div>

          {/* --- BOTTOM SECTION: CONTROLS --- */}
          <div className="grid grid-cols-12 gap-4 h-64">
            
            {/* EQ Section (Knobs) */}
            <div className="col-span-4 module-panel p-4 relative group">
                <div className="absolute top-2 left-3 text-[10px] text-zinc-500 font-bold tracking-widest uppercase">FX Unit</div>
                <div className="grid grid-cols-4 gap-2 mt-4 items-center justify-items-center h-full pb-2">
                    <Knob label="High" min={200} max={20000} value={lowPass} onChange={setLowPass} />
                    <Knob label="Low" min={0} max={1000} value={highPass} onChange={setHighPass} />
                    <Knob label="Warp" min={0} max={1} value={warpAmount} onChange={setWarpAmount} />
                    <Knob label="Space" min={0} max={0.8} value={reverbAmount} onChange={setReverbAmount} />
                    
                    <Knob label="Bits" min={1} max={16} value={bitDepth} onChange={setBitDepth} />
                    <Knob label="Rate" min={0.1} max={1} value={freqRed} onChange={setFreqRed} />
                    <Knob label="Noise" min={0} max={0.5} value={noiseLevel} onChange={setNoiseLevel} />
                    <Knob label="Volume" min={0} max={1} value={volume} onChange={setVolume} />
                </div>
            </div>

            {/* Transport & Meters */}
            <div className="col-span-5 module-panel p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Transport</div>
                </div>
                
                {/* Control Deck */}
                <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-900 flex justify-between items-center shadow-inner">
                    <button onClick={() => seek(-10)} className="p-2 text-zinc-400 hover:text-amber-500 active:scale-95"><Rewind size={20} /></button>
                    <button onClick={handlePlayPause} className={`w-12 h-12 rounded-full border-2 border-zinc-700 flex items-center justify-center shadow-lg active:scale-95 ${isPlaying ? 'bg-amber-600 text-white border-amber-800' : 'bg-zinc-700 text-zinc-300'}`}>
                        {isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor" className="ml-1"/>}
                    </button>
                    <button onClick={() => seek(10)} className="p-2 text-zinc-400 hover:text-amber-500 active:scale-95"><FastForward size={20} /></button>
                    
                    <div className="w-[1px] h-8 bg-zinc-700 mx-1"></div>
                    
                    <button 
                        onClick={handleRecord}
                        className={`p-2 rounded-full border-2 active:scale-95 transition-all ${isRecording ? 'border-red-500 bg-red-900/50 text-red-500 animate-pulse' : 'border-zinc-700 text-zinc-500 hover:text-red-400'}`}
                        title="Record Output"
                    >
                        <Circle size={12} fill="currentColor" />
                    </button>
                </div>
            </div>

            {/* Master Control */}
            <div className="col-span-3 module-panel p-4 flex flex-col justify-between">
                <div>
                   <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-4">Presets</div>
                   <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'radio', label: 'AM' },
                        { id: 'cassette', label: 'TAPE' },
                        { id: 'lofi', label: 'LO-FI' },
                        { id: 'vhs', label: 'VHS' },
                        { id: 'broken', label: 'BROKEN' },
                        { id: 'dungeon', label: 'DOOM' },
                        { id: 'ethereal', label: 'SPACE' },
                        { id: 'clean', label: 'CLEAN' },
                    ].map((preset) => (
                        <button 
                            key={preset.id}
                            onClick={() => loadPreset(preset.id)}
                            className="retro-btn text-[10px] font-bold p-1"
                        >
                            {preset.label}
                        </button>
                    ))}
                   </div>
                </div>

                {/* Noise Fader replaced by Master Vol Knob logic later, but for now kept layout */}
            </div>

          </div>
          
          {/* Footer Label */}
          <div className="flex justify-between items-end px-2 opacity-50">
               <div className="flex gap-4 text-[10px] text-zinc-600 font-mono">
                   <span>IMPEDANCE: 8Ω</span>
                   <span>FREQ: 20-20000Hz</span>
                   <span>SER.NO: 8593-XJ</span>
               </div>
               <div className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Designed in Tokyo</div>
          </div>

        </div>
      </div>
    </>
  );
}
export default App;
