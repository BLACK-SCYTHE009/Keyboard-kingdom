"use client";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

export default function GameClient({ mode, username }: { mode: 'singleplayer' | 'random', username: string }) {
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState('waiting');
    
    // Player Stats (Local)
    const [playerHp, setPlayerHp] = useState(100);
    const [playerMaxHp, setPlayerMaxHp] = useState(100);
    const [gold, setGold] = useState(0);
    const [xp, setXp] = useState(0);
    const [damage, setDamage] = useState(10);
    
    // Monster Stats (Synced)
    const [monster, setMonster] = useState<any>(null);
    const [currentWord, setCurrentWord] = useState("");
    const [typedVal, setTypedVal] = useState("");
    
    // Chat & Players
    const [players, setPlayers] = useState<any[]>([]);
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (mode === 'singleplayer') {
            // Simplified Mock for Single Player locally without emitting
            alert('Single player coming soon! Routing to Random Matchmaking for full experience.');
            router.push('/game/random');
            return;
        }

        const newSocket = io();
        setSocket(newSocket);

        // Join a random lobby (room "global" for now)
        newSocket.emit('join_lobby', { lobbyId: "random_global", username });

        newSocket.on('game_sync', (data) => {
            setGameState(data.status);
            if(data.monster) setMonster(data.monster);
            if(data.currentWord) setCurrentWord(data.currentWord);
        });

        newSocket.on('update_players', (p) => setPlayers(p));
        
        newSocket.on('spawn_monster', (m) => {
            setMonster(m);
            setTypedVal("");
        });
        
        newSocket.on('new_word', (w) => {
            setCurrentWord(w);
            setTypedVal("");
        });

        newSocket.on('monster_damaged', (data) => {
            setMonster((prev: any) => ({ ...prev, hp: data.hp }));
        });

        newSocket.on('monster_attack', (dmg) => {
            setPlayerHp(prev => {
                const newHp = prev - dmg;
                if (newHp <= 0) {
                    alert("You died.");
                    router.push('/');
                }
                return newHp; // Flash red effect handled via CSS trigger if needed
            });
        });

        newSocket.on('monster_defeated', (data) => {
            setGold(prev => prev + data.reward.gold);
            setXp(prev => prev + data.reward.xp);
            setMonster(null);
        });

        newSocket.on('game_win', () => {
            alert("VICTORY! The Dragon is defeated.");
            router.push('/');
        });

        newSocket.on('lobby_chat', (msg) => {
            setChatHistory(prev => [...prev, msg]);
        });
        
        return () => { newSocket.disconnect(); };
    }, [mode, username, router]);

    const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setTypedVal(val);
        
        if (val === currentWord && monster) {
            setTypedVal("");
            if (socket) {
                socket.emit('player_attack', { lobbyId: "random_global", word: currentWord, damage, attacker: username });
            }
        }
    };

    const sendChat = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && chatInput.trim() !== '') {
            socket?.emit('lobby_chat', { lobbyId: "random_global", sender: username, text: chatInput });
            setChatInput("");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-[#87CEEB] overflow-hidden z-20">
            {/* Multiplayer Sidebar */}
            {mode === 'random' && (
                <div className="absolute top-20 left-4 w-64 bg-gray-800/95 p-3 flex flex-col gap-2 z-40 blocky-border">
                    <h3 className="text-[10px] text-yellow-400">LOBBY (RANDOM)</h3>
                    <div className="text-[8px] text-gray-300 flex flex-col gap-1">
                        {players.map(p => <div key={p.id}>👤 {p.name}</div>)}
                    </div>
                    <button className="mc-btn bg-blue-600 text-white text-[8px] py-2 mt-2" onClick={() => alert("WebRTC VC Setup Coming Soon!")}>JOIN VOICE CHAT 🎤</button>
                    
                    <div className="border-t border-gray-600 mt-2 flex flex-col h-40">
                        <div className="text-[8px] flex-1 overflow-y-auto flex flex-col gap-1 mt-2">
                            {chatHistory.map((c, i) => (
                                <div key={i}><span className="text-blue-400">[{c.sender}]</span> {c.text}</div>
                            ))}
                        </div>
                        <input 
                            type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={sendChat}
                            className="bg-black text-[8px] p-2 text-white blocky-border-inner focus:border-white" placeholder="Chat..."
                        />
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="h-16 bg-[#8B5A2B] flex items-center justify-between px-4 pl-72 shrink-0 border-b-4 border-black z-20">
                <div className="flex items-center gap-4">
                    <div className="text-[10px] text-red-500">HP {playerHp}/{playerMaxHp}</div>
                    <div className="text-[10px] text-yellow-400">GOLD {gold}</div>
                    <div className="text-[10px] text-[#39FF14]">XP {xp}</div>
                </div>
                {gameState === 'waiting' && <button onClick={() => socket?.emit('start_game', "random_global")} className="mc-btn bg-green-500 text-xs p-2">START RAID</button>}
                <button onClick={() => router.push('/')} className="mc-btn bg-red-500 text-xs p-2">LEAVE</button>
            </header>

            {/* Combat Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative pl-72">
                <div className="absolute bottom-0 w-full h-1/3 bg-[#55AA55] border-t-8 border-[#3E8E3E] -z-10"></div>
                
                {monster && (
                    <div className="flex flex-col items-center relative">
                        <div className="text-[10px] drop-shadow-md mb-2">{monster.name}</div>
                        <div className="w-64 h-4 bg-black blocky-border-inner mb-4 relative">
                            <div className="h-full bg-red-600 transition-all" style={{ width: `${Math.max(0, (monster.hp / monster.maxHp) * 100)}%`}}></div>
                        </div>
                        <div className="w-48 h-48 bg-gray-600 blocky-border flex items-center justify-center text-6xl shadow-xl bounce">
                            {monster.emoji}
                        </div>
                        <div className="mt-8 text-2xl tracking-widest bg-black/80 px-4 py-2 blocky-border-inner drop-shadow-md">
                            {currentWord.split('').map((char, i) => (
                                <span key={i} className={i < typedVal.length ? (typedVal[i] === char ? 'text-[#39FF14]' : 'text-red-500') : 'text-white'}>
                                    {char}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="h-24 bg-gray-500 flex items-center justify-center pl-72 shrink-0 border-t-4 border-white pb-4">
                <input 
                    ref={inputRef} type="text" value={typedVal} onChange={handleType}
                    className="w-full max-w-xl h-16 bg-black text-white text-2xl font-pixel p-4 outline-none border-4 border-white focus:border-yellow-400 uppercase placeholder-gray-600 text-center"
                    placeholder="TYPE TO ATTACK..." autoFocus
                />
            </div>
        </div>
    );
}
