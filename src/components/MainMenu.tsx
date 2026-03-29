"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSettings } from "@/components/SettingsProvider";

const FIREFLIES = Array.from({ length: 20 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: `${6 + Math.random() * 8}s`,
    delay: `${Math.random() * 5}s`,
    size: `${2 + Math.random() * 4}px`
}));

// Procedurally generate grass blades
const GRASS_BLADES = Array.from({ length: 150 }, (_, i) => ({
    left: `${(i / 150) * 100}%`,
    height: `${30 + Math.random() * 50}px`,
    delay: `-${Math.random() * 4}s`,
    duration: `${3 + Math.random() * 2}s`,
    darkness: Math.random() > 0.5 ? '#1a3a10' : '#11220a'
}));

const MENU_BUTTONS = [
    { label: "SINGLE PLAYER", icon: "⚔️", desc: "Embark on a solo quest", route: "/game/singleplayer" },
    { label: "MULTIPLAYER", icon: "🌐", desc: "Join a raid with others", route: "/game/random" },
    { label: "FRIENDS", icon: "👥", desc: "Manage your party", route: "/friends" },
];

export default function MainMenu({ session }: { session: any }) {
    const router = useRouter();
    const displayName = session.user?.name?.toUpperCase() || "HERO";
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const { setSettingsOpen, particles } = useSettings();

    const handleMouseMove = (e: React.MouseEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 15; // Max 7.5 deg tilt
        const y = (e.clientY / window.innerHeight - 0.5) * -15;
        setMousePos({ x, y });
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-classy bg-cover bg-center z-50 px-4 overflow-hidden" 
             onMouseMove={handleMouseMove}>
            
            {/* ── Settings Button ── */}
            <div className="absolute top-6 right-6 z-[60]">
                <button 
                    onClick={() => setSettingsOpen(true)}
                    className="w-12 h-12 stone-panel rounded-lg flex items-center justify-center text-xl text-gray-400 hover:text-gold transition-colors hover:scale-110 active:scale-95 shadow-lg"
                    title="Settings"
                >
                    ⚙️
                </button>
            </div>

            {/* ── Floating Fireflies ── */}
            {particles && (
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
            )}

            {/* ── Interactive UI Layer ── */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-md transition-transform duration-200 ease-out"
                 style={{ transform: `perspective(1000px) rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)` }}>
                
                {/* ── Title Banner ── */}
                <div className="scale-in mb-8 w-full flex flex-col items-center" style={{ '--delay': '0.1s' } as React.CSSProperties}>
                    <h1 className="text-4xl md:text-6xl text-epic-gold text-center blocky-border bg-black/80 px-8 py-4 select-none">
                        KEYBOARD <br/> KINGDOM
                    </h1>
                    <div className="mt-4 px-6 py-2 stone-panel rounded text-xs text-white shadow-2xl flex items-center gap-2">
                        <span className="text-xl">{session.user?.avatar === "1" ? "🧙" : session.user?.avatar === "2" ? "🥷" : session.user?.avatar === "3" ? "🧑‍🌾" : session.user?.avatar === "4" ? "🤴" : "👤"}</span>
                        <span>Greetings,</span>
                        <span className="text-gold">{displayName}</span>
                    </div>
                </div>

                {/* ── Menu Buttons (Wood Style) ── */}
                <div className="flex flex-col gap-4 w-full px-4">
                    {MENU_BUTTONS.map((btn, i) => (
                        <button
                            key={btn.label}
                            onClick={() => router.push(btn.route)}
                            className={`fade-in-up wood-btn py-4 px-6 flex items-center gap-4 group`}
                            style={{ '--delay': `${0.35 + i * 0.1}s` } as React.CSSProperties}
                        >
                            <span className="text-3xl drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                                {btn.icon}
                            </span>
                            <div className="flex flex-col items-start flex-1">
                                <span className="text-sm font-bold tracking-widest">{btn.label}</span>
                                <span className="text-[9px] text-gray-300 mt-0.5">{btn.desc}</span>
                            </div>
                            <span className="ml-auto text-white/50 text-xl group-hover:text-gold group-hover:translate-x-1 transition-all duration-300">
                                ➔
                            </span>
                        </button>
                    ))}

                    {/* ── Logout Button ── */}
                    <button
                        onClick={() => signOut()}
                        className="fade-in-up mt-6 mx-auto mc-btn bg-red-900 border-red-950 px-8 py-2 text-[10px] text-white hover:bg-red-800 transition-all duration-300 blocky-border"
                        style={{ '--delay': '0.7s' } as React.CSSProperties}
                    >
                        🚪 LOGOUT
                    </button>
                </div>
            </div>

            {/* ── Animated Swaying Grass Foreground ── */}
            <div className="grass-container">
                {GRASS_BLADES.map((g, i) => (
                    <div key={i} className="grass-blade"
                         style={{
                             left: g.left,
                             height: g.height,
                             animationDelay: g.delay,
                             animationDuration: g.duration,
                             background: `linear-gradient(to top, ${g.darkness}, #3E8E3E)`
                         }}>
                    </div>
                ))}
            </div>

            {/* ── Footer ── */}
            <div className="fade-in-up absolute bottom-2 text-[8px] tracking-[0.2em] text-white/70 z-10 select-none drop-shadow-md"
                 style={{ '--delay': '0.9s' } as React.CSSProperties}>
                KEYBOARD KINGDOM V1.0
            </div>
        </div>
    );
}
