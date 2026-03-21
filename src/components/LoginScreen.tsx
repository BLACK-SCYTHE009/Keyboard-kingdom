"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (isLogin) {
            const res = await signIn("credentials", { username, password, redirect: false });
            if (res?.error) {
                setError("Invalid username or password");
                setLoading(false);
            } else {
                window.location.href = "/"; // Force full reload to catch session correctly
            }
        } else {
            // Signup flow
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                // Instantly log them in after signup
                await signIn("credentials", { username, password, callbackUrl: "/" });
            } else {
                const data = await res.json();
                setError(data.error || "Signup failed");
                setLoading(false);
            }
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#87CEEB]/90 backdrop-blur-sm z-50 px-4">
            <h1 className="text-3xl md:text-5xl text-[#8B5A2B] mb-8 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] text-center tracking-wide blocky-border bg-[#55AA55] p-6">
                TYPING CRAFT MMO
            </h1>
            <div className="mb-4 text-white text-[10px] md:text-xs text-center leading-loose bg-black/50 p-4 blocky-border">
                {isLogin ? "Log in to pick up where you left off!" : "Sign up to save your levels and friends!"}
            </div>
            
            <div className="flex gap-4 mb-4">
                <button onClick={() => { setIsLogin(true); setError(""); }} className={`mc-btn p-2 text-xs ${isLogin ? 'bg-blue-600 outline-white' : 'bg-gray-700'}`}>LOG IN</button>
                <button onClick={() => { setIsLogin(false); setError(""); }} className={`mc-btn p-2 text-xs ${!isLogin ? 'bg-blue-600 outline-white' : 'bg-gray-700'}`}>SIGN UP</button>
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-4 w-64">
                {error && <div className="text-red-500 text-xs text-center bg-black/80 p-2 blocky-border-inner">{error}</div>}
                
                <input 
                    type="text" 
                    placeholder="USERNAME" 
                    required 
                    autoComplete="off"
                    value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-black text-white text-[10px] md:text-xs p-4 blocky-border-inner focus:outline-none" 
                />
                <input 
                    type="password" 
                    placeholder="PASSWORD" 
                    required 
                    autoComplete="new-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black text-white text-[10px] md:text-xs p-4 blocky-border-inner focus:outline-none" 
                />
                <button type="submit" disabled={loading} className="mc-btn bg-[#55AA55] text-white py-4 mt-4">
                    {loading ? "CONNECTING..." : (isLogin ? "JOIN REALM" : "CREATE ACCOUNT")}
                </button>
            </form>
        </div>
    );
}
