"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useSettings } from "@/components/SettingsProvider";

const MENU_BUTTONS = [
  { label: "SINGLE PLAYER", icon: "S", desc: "Embark on a solo quest", route: "/game/singleplayer" },
  { label: "MULTIPLAYER", icon: "M", desc: "Join a raid with others", route: "/game/random" },
  { label: "FRIENDS", icon: "F", desc: "Manage your party", route: "/friends" },
];

type MainMenuSession = {
  user?: {
    id?: string | null;
    name?: string | null;
    displayName?: string | null;
    avatar?: string | null;
    character?: string | null;
    level?: number | null;
    xp?: number | null;
  };
};

type Firefly = {
  left: string;
  top: string;
  duration: string;
  delay: string;
  size: string;
};

type GrassBlade = {
  left: string;
  height: string;
  delay: string;
  duration: string;
  darkness: string;
};

function seeded(seed: number) {
  const value = Math.sin(seed * 999) * 10000;
  return value - Math.floor(value);
}

const FIREFLIES: Firefly[] = Array.from({ length: 20 }, (_, index) => ({
  left: `${seeded(index + 1) * 100}%`,
  top: `${seeded(index + 21) * 100}%`,
  duration: `${6 + seeded(index + 41) * 8}s`,
  delay: `${seeded(index + 61) * 5}s`,
  size: `${2 + seeded(index + 81) * 4}px`,
}));

const GRASS_BLADES: GrassBlade[] = Array.from({ length: 150 }, (_, index) => ({
  left: `${(index / 150) * 100}%`,
  height: `${30 + seeded(index + 101) * 50}px`,
  delay: `-${seeded(index + 251) * 4}s`,
  duration: `${3 + seeded(index + 401) * 2}s`,
  darkness: seeded(index + 551) > 0.5 ? "#1a3a10" : "#11220a",
}));

export default function MainMenu({ session }: { session: MainMenuSession }) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { setSettingsOpen, particles } = useSettings();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const displayName = (session.user?.displayName || session.user?.name || "Hero").toUpperCase();

  const handleMouseMove = (event: React.MouseEvent) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 15;
    const y = (event.clientY / window.innerHeight - 0.5) * -15;
    setMousePos({ x, y });
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-classy bg-cover bg-center px-4" onMouseMove={handleMouseMove}>
      <div className="absolute right-6 top-6 z-[60]">
        <button
          onClick={() => setSettingsOpen(true)}
          className="stone-panel flex h-12 w-12 items-center justify-center rounded-lg text-xs font-bold text-gray-300 shadow-lg transition-colors hover:scale-110 hover:text-gold active:scale-95"
          title="Settings"
        >
          SET
        </button>
      </div>

      {particles && (
        <div className="fireflies">
          {FIREFLIES.map((firefly, index) => (
            <div
              key={index}
              className="absolute rounded-full bg-yellow-300"
              style={{
                left: firefly.left,
                top: firefly.top,
                width: firefly.size,
                height: firefly.size,
                boxShadow: "0 0 8px rgba(255, 255, 0, 0.8)",
                animation: `bounce ${firefly.duration} ease-in-out infinite alternate`,
                animationDelay: firefly.delay,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="relative z-10 flex w-full max-w-md flex-col items-center transition-transform duration-200 ease-out"
        style={{ transform: `perspective(1000px) rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)` }}
      >
        <div className="scale-in mb-8 flex w-full flex-col items-center" style={{ "--delay": "0.1s" } as React.CSSProperties}>
          <h1 className="blocky-border bg-black/80 px-8 py-4 text-center text-4xl text-epic-gold md:text-6xl">
            KEYBOARD <br /> KINGDOM
          </h1>
          <div className="stone-panel mt-4 flex items-center gap-2 rounded px-6 py-2 text-sm text-white shadow-2xl">
            <span>Greetings,</span>
            <span className="text-gold">{displayName}</span>
            <span className="text-xs text-gray-300">LVL {session.user?.level || 1}</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 px-4">
          {MENU_BUTTONS.map((button, index) => (
            <button
              key={button.label}
              onClick={() => router.push(button.route)}
              className="wood-btn fade-in-up flex items-center gap-4 px-6 py-4"
              style={{ "--delay": `${0.35 + index * 0.1}s` } as React.CSSProperties}
            >
              <span className="flex h-10 w-10 items-center justify-center border-2 border-black/50 bg-black/30 text-lg text-gold transition-transform duration-300 group-hover:scale-110">
                {button.icon}
              </span>
              <div className="flex flex-1 flex-col items-start">
                <span className="text-sm font-bold tracking-widest">{button.label}</span>
                <span className="mt-0.5 text-xs text-gray-300">{button.desc}</span>
              </div>
              <span className="ml-auto text-xl text-white/50 transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold">&gt;</span>
            </button>
          ))}

          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="mc-btn blocky-border fade-in-up mx-auto mt-6 bg-red-900 px-8 py-2 text-xs font-bold text-white transition-all duration-300 hover:bg-red-800"
            style={{ "--delay": "0.7s" } as React.CSSProperties}
          >
            LOGOUT
          </button>
        </div>
      </div>

      <div className="grass-container">
        {GRASS_BLADES.map((blade, index) => (
          <div
            key={index}
            className="grass-blade"
            style={{
              left: blade.left,
              height: blade.height,
              animationDelay: blade.delay,
              animationDuration: blade.duration,
              background: `linear-gradient(to top, ${blade.darkness}, #3E8E3E)`,
            }}
          />
        ))}
      </div>

      <div className="fade-in-up absolute bottom-2 z-10 select-none text-[8px] tracking-[0.2em] text-white/70 drop-shadow-md" style={{ "--delay": "0.9s" } as React.CSSProperties}>
        KEYBOARD KINGDOM V2.0
      </div>
    </div>
  );
}
