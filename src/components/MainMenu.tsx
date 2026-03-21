"use client";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function MainMenu({ session }: { session: any }) {
    const router = useRouter();

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#87CEEB]/90 backdrop-blur-sm z-50 px-4">
            <h1 className="text-2xl md:text-4xl text-[#8B5A2B] mb-8 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] text-center tracking-wide blocky-border bg-[#55AA55] p-6">
                WELCOME, {session.user?.name?.toUpperCase()}
            </h1>
            <div className="flex flex-col gap-4 w-64 md:w-80">
                <button onClick={() => router.push('/game/singleplayer')} className="mc-btn blocky-border bg-[#55AA55] text-white py-4 text-[10px]">
                    SINGLE PLAYER
                </button>
                <button onClick={() => router.push('/game/random')} className="mc-btn blocky-border bg-blue-500 text-white py-4 text-[10px]">
                    MULTIPLAYER LOBBY
                </button>
                <button onClick={() => alert("Friends UI coming up!")} className="mc-btn blocky-border bg-yellow-500 text-white py-4 text-[10px]">
                    SOCIAL (FRIENDS)
                </button>
                <button onClick={() => signOut()} className="mc-btn blocky-border bg-red-500 text-white py-4 text-[10px] mt-8">
                    LOGOUT
                </button>
            </div>
        </div>
    );
}
