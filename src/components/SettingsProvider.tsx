"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type SettingsContextType = {
    bgmVolume: number;
    setBgmVolume: (v: number) => void;
    sfxVolume: number;
    setSfxVolume: (v: number) => void;
    particles: boolean;
    setParticles: (b: boolean) => void;
    isSettingsOpen: boolean;
    setSettingsOpen: (b: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error("useSettings must be used within SettingsProvider");
    return context;
};

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [bgmVolume, setBgmVolumeState] = useState(0.5);
    const [sfxVolume, setSfxVolumeState] = useState(0.5);
    const [particles, setParticlesState] = useState(true);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isClient, setIsClient] = useState(false);

    // Load from localStorage
    useEffect(() => {
        setIsClient(true);
        try {
            const saved = localStorage.getItem('kbk_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.bgmVolume !== undefined) setBgmVolumeState(parsed.bgmVolume);
                if (parsed.sfxVolume !== undefined) setSfxVolumeState(parsed.sfxVolume);
                if (parsed.particles !== undefined) setParticlesState(parsed.particles);
            }
        } catch (e) { console.error("Could not load settings"); }
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (!isClient) return;
        localStorage.setItem('kbk_settings', JSON.stringify({ bgmVolume, sfxVolume, particles }));
        if (audioRef.current) {
            audioRef.current.volume = bgmVolume;
        }
    }, [bgmVolume, sfxVolume, particles, isClient]);

    // Handle audio play interaction and initial mount auto-play attempt
    useEffect(() => {
        const tryPlay = () => {
            if (audioRef.current && audioRef.current.paused && bgmVolume > 0) {
                audioRef.current.play().catch(() => {
                    // Browsers strictly block un-interacted audio playback.
                });
            }
        };
        
        // Attempt immediate auto-play on hydration
        tryPlay();

        window.addEventListener('click', tryPlay);
        window.addEventListener('keydown', tryPlay);
        return () => {
            window.removeEventListener('click', tryPlay);
            window.removeEventListener('keydown', tryPlay);
        }
    }, [bgmVolume]);

    return (
        <SettingsContext.Provider value={{
            bgmVolume, setBgmVolume: setBgmVolumeState,
            sfxVolume, setSfxVolume: setSfxVolumeState,
            particles, setParticles: setParticlesState,
            isSettingsOpen, setSettingsOpen
        }}>
            {children}
            
            {/* Global Background Music */}
            <audio ref={audioRef} src="/audio/bgm.mp3" loop preload="auto" autoPlay />

            {/* Global Settings Modal Overlay */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="stone-panel max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 relative">
                        <button 
                            onClick={() => setSettingsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold"
                        >
                            ✕
                        </button>
                        
                        <h2 className="text-2xl text-epic-gold text-center mb-6 tracking-widest">SETTINGS</h2>
                        
                        <div className="space-y-6">
                            {/* Music Volume Slider */}
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-300 mb-2 font-bold tracking-wider">
                                    <span>MUSIC</span>
                                    <span>{Math.round(bgmVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1" step="0.05"
                                    value={bgmVolume} 
                                    onChange={(e) => setBgmVolumeState(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-gold"
                                />
                            </div>

                            {/* SFX Volume Slider */}
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-300 mb-2 font-bold tracking-wider">
                                    <span>SOUND EFFECTS</span>
                                    <span>{Math.round(sfxVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1" step="0.05"
                                    value={sfxVolume} 
                                    onChange={(e) => setSfxVolumeState(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-gold"
                                />
                            </div>

                            {/* Particles Toggle */}
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-[10px] text-gray-300 font-bold tracking-wider">PARTICLE EFFECTS</span>
                                <button 
                                    onClick={() => setParticlesState(!particles)}
                                    className={`wood-btn px-4 py-2 text-[10px] ${particles ? 'text-green-400' : 'text-red-400'}`}
                                >
                                    {particles ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 text-center border-t border-white/10 pt-4">
                            <button 
                                onClick={() => setSettingsOpen(false)}
                                className="wood-btn px-8 py-3 text-sm w-full"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SettingsContext.Provider>
    );
}
