"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSettings } from "@/components/SettingsProvider";

const FIREFLIES = Array.from({ length: 20 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: `${2 + Math.random() * 3}px`,
    duration: `${3 + Math.random() * 4}s`,
    delay: `${Math.random() * 2}s`
}));

const GRASS_BLADES = Array.from({ length: 150 }, (_, i) => ({
    left: `${(i / 150) * 100}%`,
    height: `${30 + Math.random() * 40}px`,
    animationDelay: `${Math.random() * 2}s`,
    animationDuration: `${2 + Math.random() * 2}s`
}));

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [step, setStep] = useState(1); // For Signup: 1=Creds, 2=Avatar, 3=Character
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [avatar, setAvatar] = useState("1");
    const [character, setCharacter] = useState("heroA");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const { particles } = useSettings();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isLogin && step < 3) {
            setStep(s => s + 1);
            return;
        }

        setLoading(true);
        setError("");

        if (isLogin) {
            const res = await signIn("credentials", { username, password, redirect: false });
            if (res?.error) {
                setError("Invalid username or password");
                setLoading(false);
            } else {
                window.location.href = "/";
            }
        } else {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, avatar, character })
            });

            if (res.ok) {
                await signIn("credentials", { username, password, callbackUrl: "/" });
            } else {
                const data = await res.json();
                setError(data.error || "Signup failed");
                setLoading(false);
                setStep(1);
            }
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-classy bg-cover bg-center z-50 overflow-hidden text-center backdrop-blur-sm">
            
            {/* ── Background Animations ── */}
            {particles && (
                <>
                    <div className="fireflies">
                        {FIREFLIES.map((f, i) => (
                            <div key={i} className="absolute rounded-full bg-yellow-300 pointer-events-none"
                                 style={{ 
                                     left: f.left, top: f.top, width: f.size, height: f.size,
                                     boxShadow: '0 0 8px rgba(255, 255, 0, 0.8)',
                                     animation: `bounce ${f.duration} ease-in-out infinite alternate`,
                                     animationDelay: f.delay
                                 }}>
                            </div>
                        ))}
                    </div>
                    <div className="grass-container pointer-events-none z-10 w-full absolute bottom-0 h-48">
                        {GRASS_BLADES.map((g) => (
                            <div className="grass-blade absolute bottom-0 w-2 bg-gradient-to-t from-green-900 to-[#55AA55] origin-bottom rounded-t-full"
                                 key={g.left}
                                 style={{ 
                                     left: g.left,
                                     height: g.height,
                                     animationDelay: g.animationDelay,
                                     animationDuration: g.animationDuration
                                 }}>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── Main UI Component ── */}
            <div className="relative z-20 flex flex-col items-center w-full max-w-md transition-transform duration-200 ease-out slide-in-top">
                
                {/* Title */}
                <h1 className="text-4xl text-epic-gold mb-3 text-shadow-drop tracking-widest scale-in text-center"
                    style={{ '--delay': '0.1s' } as React.CSSProperties}>
                    KEYBOARD KINGDOM
                </h1>
                
                {/* Info Text */}
                <div className="px-6 py-2 bg-black/70 blocky-border-inner text-[10px] text-gray-300 mb-8 tracking-widest fade-in-up"
                     style={{ '--delay': '0.3s' } as React.CSSProperties}>
                    TYPE TO CONQUER · FIGHT TO SURVIVE
                </div>

                {/* Authentication Panel */}
                <div className="stone-panel w-full max-w-[320px] p-6 lg:p-8 fade-in-up relative overflow-hidden shadow-2xl min-h-[400px]"
                     style={{ '--delay': '0.4s' } as React.CSSProperties}>
                    
                    {/* Shadow detailing */}
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border border-white/5"></div>

                    {/* Auth Toggle Tabs */}
                    <div className="flex gap-2 mb-6 relative z-10">
                        <button
                            onClick={() => { setIsLogin(true); setError(""); setStep(1); }}
                            className={`flex-1 py-3 text-[10px] font-bold tracking-wider transition-all duration-300 border-2 blocky-border ${
                                isLogin
                                    ? 'bg-[#8B5A2B] text-gold border-[#5c3a1a] shadow-[inset_0_4px_10px_rgba(255,255,255,0.1)]'
                                    : 'bg-[#2a2a2a] text-gray-500 border-[#1a1a1a] hover:bg-[#333]'
                            }`}
                        >
                            LOG IN
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(""); setStep(1); }}
                            className={`flex-1 py-3 text-[10px] font-bold tracking-wider transition-all duration-300 border-2 blocky-border ${
                                !isLogin
                                    ? 'bg-[#8B5A2B] text-gold border-[#5c3a1a] shadow-[inset_0_4px_10px_rgba(255,255,255,0.1)]'
                                    : 'bg-[#2a2a2a] text-gray-500 border-[#1a1a1a] hover:bg-[#333]'
                            }`}
                        >
                            SIGN UP
                        </button>
                    </div>

                    {/* Form Component */}
                    <form onSubmit={handleAuth} className="flex flex-col gap-4 relative z-10 w-full h-full">
                        {error && (
                            <div className="text-red-400 text-[10px] font-bold text-center bg-red-950/80 p-3 border-2 border-red-900 error-shake mb-2">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Step Indicator for Signup */}
                        {!isLogin && (
                            <div className="flex justify-between mb-4 scale-in">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className={`h-1.5 flex-1 mx-0.5 rounded-full ${step >= s ? 'bg-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]' : 'bg-black/50'}`}></div>
                                ))}
                            </div>
                        )}

                        {(isLogin || step === 1) && (
                            <div className="flex flex-col gap-4 fade-in">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[12px] opacity-60">👤</span>
                                    <input
                                        type="text" placeholder="USERNAME" required autoComplete="off"
                                        value={username} onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-[#1a1a1a] text-gray-200 text-[10px] md:text-xs p-4 pl-9 border-2 border-t-black border-l-black border-b-gray-700 border-r-gray-700 focus:outline-none focus:border-yellow-600 transition-colors shadow-inner"
                                    />
                                </div>

                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[12px] opacity-60">🔒</span>
                                    <input
                                        type="password" placeholder="PASSWORD" required autoComplete="new-password"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-[#1a1a1a] text-gray-200 text-[10px] md:text-xs p-4 pl-9 border-2 border-t-black border-l-black border-b-gray-700 border-r-gray-700 focus:outline-none focus:border-yellow-600 transition-colors shadow-inner"
                                    />
                                </div>
                            </div>
                        )}

                        {!isLogin && step === 2 && (
                            <div className="flex flex-col gap-3 fade-in">
                                <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest">Select Avatar</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {["1", "2", "3", "4"].map(id => (
                                        <button
                                            key={id} type="button"
                                            onClick={() => setAvatar(id)}
                                            className={`aspect-square p-2 blocky-border transition-all duration-200 ${avatar === id ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-black/40 border-gray-700 opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className="w-full h-full flex items-center justify-center text-3xl">
                                                {id === "1" ? "🧙" : id === "2" ? "🥷" : id === "3" ? "🧑‍🌾" : "🤴"}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isLogin && step === 3 && (
                            <div className="flex flex-col gap-3 fade-in">
                                <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest">Choose Your Hero</div>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setCharacter("heroA")}
                                        className={`p-3 blocky-border transition-all duration-200 ${character === "heroA" ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-black/40 border-gray-700 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="text-2xl mb-1">🤺</div>
                                        <div className="text-[8px] text-white">Knight</div>
                                        <div className="text-[6px] text-gray-400">Classic Hero</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCharacter("heroB")}
                                        className={`p-3 blocky-border transition-all duration-200 ${character === "heroB" ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-black/40 border-gray-700 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="text-2xl mb-1">🏹</div>
                                        <div className="text-[8px] text-white">Ranger</div>
                                        <div className="text-[6px] text-gray-400">Swift Hero</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCharacter("stella")}
                                        className={`p-3 blocky-border transition-all duration-200 ${character === "stella" ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-black/40 border-gray-700 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="text-2xl mb-1">👸</div>
                                        <div className="text-[8px] text-white">Stella</div>
                                        <div className="text-[6px] text-gray-400">Mystic Hero</div>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCharacter("tomb_raider_laracroft")}
                                        className={`p-3 blocky-border transition-all duration-200 ${character === "tomb_raider_laracroft" ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-black/40 border-gray-700 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="text-2xl mb-1">🗡️</div>
                                        <div className="text-[8px] text-white">Adventurer</div>
                                        <div className="text-[6px] text-gray-400">Elite Hero</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCharacter("realistic_female")}
                                        className={`p-3 blocky-border transition-all duration-200 ${character === "realistic_female" ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-black/40 border-gray-700 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="text-2xl mb-1">🦸</div>
                                        <div className="text-[8px] text-white">Warrior</div>
                                        <div className="text-[6px] text-gray-400">Legendary Hero</div>
                                    </button>
                                </div>
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Clear all previous login data
                                            if (typeof window !== 'undefined') {
                                                localStorage.clear();
                                                sessionStorage.clear();
                                                // Clear NextAuth session
                                                document.cookie.split(";").forEach(cookie => {
                                                    const eqPos = cookie.indexOf("=");
                                                    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                                                    if (name.startsWith("next-auth") || name.startsWith("__Secure")) {
                                                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                                                    }
                                                });
                                            }
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white text-[9px] px-3 py-2 blocky-border mb-4 transition-colors"
                                    >
                                        🗑️ Clear All Data
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto flex gap-2">
                            {!isLogin && step > 1 && (
                                <button
                                    type="button" onClick={() => setStep(s => s - 1)}
                                    className="bg-gray-700 hover:bg-gray-600 text-white text-[9px] px-4 py-4 blocky-border transition-colors"
                                >
                                    BACK
                                </button>
                            )}
                            <button
                                type="submit" disabled={loading}
                                className="wood-btn flex-1 py-4 text-[11px] tracking-wider text-white font-bold opacity-100 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
                                <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                                    {loading ? (
                                        <>CONNECTING<span className="loading-dots"></span></>
                                    ) : (
                                        isLogin ? "⚔️ JOIN REALM" : (step === 3 ? "✨ FINALIZE" : "NEXT →")
                                    )}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="fade-in-up mt-8 text-[8px] text-gray-400 font-bold opacity-60 tracking-widest"
                     style={{ '--delay': '0.8s' } as React.CSSProperties}>
                    v1.0.2 · PERSONALIZED EDITION
                </div>
            </div>
            
            {/* ── Settings Initializer Overlap Fix ── */}
            <div className="absolute top-4 right-4 pointer-events-none opacity-0"></div>
        </div>
    );
}
