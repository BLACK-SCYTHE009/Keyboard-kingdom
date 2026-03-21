"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await signIn("credentials", { username, password, callbackUrl: "/" });
        // if bad login, it refreshes automatically per default behavior or we could handle it manually
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#87CEEB]/90 backdrop-blur-sm z-50 px-4">
            <h1 className="text-3xl md:text-5xl text-[#8B5A2B] mb-8 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] text-center tracking-wide blocky-border bg-[#55AA55] p-6">
                TYPING CRAFT MMO
            </h1>
            <div className="mb-8 text-white text-[10px] md:text-xs text-center leading-loose bg-black/50 p-4 blocky-border">
                Log in or sign up automatically<br/>to save your levels and friends.
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-64">
                <input 
                    type="text" 
                    placeholder="USERNAME" 
                    required 
                    value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-black text-white text-[10px] md:text-xs p-4 blocky-border-inner focus:outline-none" 
                />
                <input 
                    type="password" 
                    placeholder="PASSWORD" 
                    required 
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black text-white text-[10px] md:text-xs p-4 blocky-border-inner focus:outline-none" 
                />
                <button type="submit" disabled={loading} className="mc-btn bg-[#55AA55] text-white py-4 mt-4">
                    {loading ? "CONNECTING..." : "JOIN REALM"}
                </button>
            </form>
        </div>
    );
}
