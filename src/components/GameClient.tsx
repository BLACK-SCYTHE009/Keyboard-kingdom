"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

// ─── Sound Effects ───
function createAudioCtx() {
    if (typeof window === 'undefined') return null;
    return new (window.AudioContext || (window as any).webkitAudioContext)();
}
function playSound(ctx: AudioContext | null, type: 'hit' | 'hurt' | 'death' | 'levelup' | 'defeat' | 'combo' | 'unlock' | 'wrong') {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    switch (type) {
        case 'hit':
            osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
        case 'hurt':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); break;
        case 'death':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.5);
            gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5); break;
        case 'levelup':
            osc.type = 'sine'; osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
            osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5); break;
        case 'defeat':
            osc.type = 'square'; osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4); break;
        case 'combo':
            osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08); break;
        case 'unlock':
            osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(554, ctx.currentTime + 0.15); osc.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.45);
            gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.7);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.7); break;
        case 'wrong':
            osc.type = 'square'; osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); break;
    }
}

// ─── Level Data ───
const WORDS = [
    "SWORD", "PICKAXE", "DIRT", "WOOD", "DIAMOND", "APPLE", "IRON", "GOLD",
    "STONE", "CRAFT", "FURNACE", "CHEST", "POTION", "BLOCK", "MINING",
    "CAVE", "TORCH", "LAVA", "WATER", "OBSIDIAN", "PORTAL", "ARMOR",
    "EMERALD", "NETHER", "REDSTONE", "PISTON", "BEACON", "ENCHANT", "TRIDENT", "ANVIL"
];

const REGULAR_MONSTERS = [
    { name: "Slime", emoji: "🟩" }, { name: "Spider", emoji: "🕷️" },
    { name: "Skeleton", emoji: "💀" }, { name: "Zombie", emoji: "🧟" },
    { name: "Creeper", emoji: "💣" }, { name: "Enderman", emoji: "👾" },
    { name: "Blaze", emoji: "🔥" }, { name: "Witch", emoji: "🧙" },
    { name: "Phantom", emoji: "👻" },
];

const BOSSES = [
    { name: "Wither", emoji: "💀", title: "THE WITHER" },
    { name: "Ender Dragon", emoji: "🐉", title: "THE ENDER DRAGON" },
    { name: "Warden", emoji: "🗿", title: "THE WARDEN" },
];

const MINI_QUESTS = [
    { q: "What tool do you use to mine diamonds?", a: "PICKAXE", hint: "🪨 A mining tool..." },
    { q: "What block do you place to make light?", a: "TORCH", hint: "🔦 Lights up caves..." },
    { q: "What creature explodes when near you?", a: "CREEPER", hint: "💣 Sssssss..." },
    { q: "What dimension has lava oceans?", a: "NETHER", hint: "🔥 A fiery realm..." },
    { q: "What gem is the rarest to find?", a: "EMERALD", hint: "💚 Villagers love it..." },
    { q: "What do you build to travel dimensions?", a: "PORTAL", hint: "🌀 Made of obsidian..." },
    { q: "What protects you from damage?", a: "ARMOR", hint: "🛡️ Wear it to survive..." },
    { q: "What block powers mechanisms?", a: "REDSTONE", hint: "🔴 Minecraft electricity..." },
    { q: "What do you use to repair items?", a: "ANVIL", hint: "🔨 Heavy iron block..." },
    { q: "What do you use to enchant items?", a: "ENCHANT", hint: "✨ Magical table..." },
    { q: "What ore makes the strongest tools?", a: "DIAMOND", hint: "💎 Blue and shiny..." },
    { q: "What do you store items in?", a: "CHEST", hint: "📦 Wooden storage..." },
    { q: "What liquid destroys items?", a: "LAVA", hint: "🌋 Hot and orange..." },
    { q: "What do you drink for buffs?", a: "POTION", hint: "🧪 Brewed in a stand..." },
    { q: "What do you smelt ores in?", a: "FURNACE", hint: "🔥 Cook and smelt..." },
    { q: "What mob lives in the End?", a: "ENDERMAN", hint: "👾 Tall and dark..." },
    { q: "What weapon shoots arrows?", a: "BOW", hint: "🏹 Pull back and release..." },
    { q: "What material comes from trees?", a: "WOOD", hint: "🌲 Chop chop..." },
    { q: "What do you need to breathe underwater?", a: "POTION", hint: "🧪 Brew water breathing..." },
    { q: "What food restores the most hunger?", a: "GOLD", hint: "🍎 A golden fruit..." },
];

function getMonsterForLevel(lvl: number) {
    const isBoss = lvl % 10 === 0;
    if (isBoss) {
        const bossIdx = Math.floor(lvl / 10) - 1;
        const boss = BOSSES[bossIdx % BOSSES.length];
        const scale = 1 + Math.floor(bossIdx / BOSSES.length) * 0.5;
        return {
            name: boss.title, emoji: boss.emoji, isBoss: true,
            maxHp: Math.floor(500 * scale * (1 + lvl * 0.05)),
            attack: Math.floor(20 + lvl * 1.5),
            speed: Math.max(1200, 3000 - lvl * 50),
            reward: { gold: 100 + lvl * 10, xp: 200 + lvl * 20 }
        };
    }
    const m = REGULAR_MONSTERS[(lvl - 1) % REGULAR_MONSTERS.length];
    return {
        name: m.name, emoji: m.emoji, isBoss: false,
        maxHp: Math.floor(60 + lvl * 15),
        attack: Math.floor(3 + lvl * 1.2),
        speed: Math.max(1500, 4000 - lvl * 60),
        reward: { gold: 5 + lvl * 3, xp: 10 + lvl * 5 }
    };
}

function getQuestForLevel(lvl: number) {
    return MINI_QUESTS[(lvl - 1) % MINI_QUESTS.length];
}

function pickWord() { return WORDS[Math.floor(Math.random() * WORDS.length)]; }

const TOTAL_LEVELS = 30;
const STORAGE_KEY = 'kk-progress';

function loadProgress(): number {
    if (typeof window === 'undefined') return 1;
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? Math.max(1, parseInt(v, 10)) : 1;
}
function saveProgress(lvl: number) {
    if (typeof window === 'undefined') return;
    const cur = loadProgress();
    if (lvl > cur) localStorage.setItem(STORAGE_KEY, String(lvl));
}

// ═══════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════
export default function GameClient({ mode, username }: { mode: 'singleplayer' | 'random', username: string }) {
    const router = useRouter();
    const audioCtxRef = useRef<AudioContext | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    // Game screens: 'levelselect' | 'quest' | 'playing' | 'dead' | 'victory' | 'levelcomplete' | 'waiting'
    const [screen, setScreen] = useState<string>(mode === 'singleplayer' ? 'levelselect' : 'waiting');
    const [unlockedLevel, setUnlockedLevel] = useState(1);
    const [currentLevel, setCurrentLevel] = useState(1);

    // Quest state
    const [questAnswer, setQuestAnswer] = useState("");
    const [questError, setQuestError] = useState("");
    const [questHintShown, setQuestHintShown] = useState(false);

    // Player stats
    const [playerLvl, setPlayerLvl] = useState(1);
    const [playerHp, setPlayerHp] = useState(100);
    const [playerMaxHp, setPlayerMaxHp] = useState(100);
    const [gold, setGold] = useState(0);
    const [xp, setXp] = useState(0);
    const [xpToNext, setXpToNext] = useState(100);
    const [damage, setDamage] = useState(10);
    const [combo, setCombo] = useState(0);
    const [shake, setShake] = useState(false);
    const [flash, setFlash] = useState(false);
    const [deathOpacity, setDeathOpacity] = useState(0);
    const [levelUpFlash, setLevelUpFlash] = useState(false);

    // Fight
    const [monster, setMonster] = useState<any>(null);
    const [currentWord, setCurrentWord] = useState("");
    const [typedVal, setTypedVal] = useState("");
    const [monstersKilled, setMonstersKilled] = useState(0);
    const attackTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Multiplayer
    const [players, setPlayers] = useState<any[]>([]);
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Load progress
    useEffect(() => {
        setUnlockedLevel(loadProgress());
    }, []);

    const ensureAudio = useCallback(() => {
        if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    }, []);

    // ─── QUEST LOGIC ───
    const startQuest = (lvl: number) => {
        ensureAudio();
        setCurrentLevel(lvl);
        setQuestAnswer("");
        setQuestError("");
        setQuestHintShown(false);
        setScreen('quest');
    };

    const submitQuest = () => {
        const quest = getQuestForLevel(currentLevel);
        if (questAnswer.toUpperCase().trim() === quest.a) {
            playSound(audioCtxRef.current, 'unlock');
            startFight(currentLevel);
        } else {
            playSound(audioCtxRef.current, 'wrong');
            setQuestError("Wrong! Try again...");
            setQuestHintShown(true);
        }
    };

    // ─── FIGHT LOGIC ───
    const startFight = (lvl: number) => {
        ensureAudio();
        setCurrentLevel(lvl);
        setScreen('playing');
        setCombo(0);
        setTypedVal("");
        const m = getMonsterForLevel(lvl);
        const monsterData = { ...m, hp: m.maxHp };
        setMonster(monsterData);
        setCurrentWord(pickWord());
        setPlayerHp(playerMaxHp);
    };

    // Attack timer
    const spStartAttackTimer = useCallback((m: any) => {
        if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
        attackTimerRef.current = setTimeout(() => {
            playSound(audioCtxRef.current, 'hurt');
            setShake(true);
            setCombo(0);
            setTimeout(() => setShake(false), 300);
            setPlayerHp(prev => {
                const newHp = prev - m.attack;
                if (newHp <= 0) {
                    playSound(audioCtxRef.current, 'death');
                    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
                    setScreen('dead');
                    return 0;
                }
                spStartAttackTimer(m);
                return newHp;
            });
        }, m.speed);
    }, []);

    useEffect(() => {
        if (mode === 'singleplayer' && screen === 'playing' && monster) {
            spStartAttackTimer(monster);
        }
        return () => { if (attackTimerRef.current) clearTimeout(attackTimerRef.current); };
    }, [mode, screen, monster, spStartAttackTimer]);

    // ─── MULTIPLAYER ───
    useEffect(() => {
        if (mode !== 'random') return;
        const newSocket = io();
        setSocket(newSocket);
        newSocket.emit('join_lobby', { lobbyId: "random_global", username });
        newSocket.on('game_sync', (data) => {
            setScreen(data.status === 'playing' ? 'playing' : 'waiting');
            if (data.monster) setMonster(data.monster);
            if (data.currentWord) setCurrentWord(data.currentWord);
            if (data.playerData) {
                setPlayerLvl(data.playerData.level || 1);
                setXp(data.playerData.xp || 0);
                setDamage(10 + ((data.playerData.level || 1) * 2));
                setPlayerMaxHp(100 + ((data.playerData.level || 1) * 10));
                setPlayerHp(100 + ((data.playerData.level || 1) * 10));
            }
        });
        newSocket.on('game_started', () => setScreen('playing'));
        newSocket.on('update_players', (p) => setPlayers(p));
        newSocket.on('spawn_monster', (m) => { setMonster(m); setTypedVal(""); });
        newSocket.on('new_word', (w) => { setCurrentWord(w); setTypedVal(""); });
        newSocket.on('monster_damaged', (data) => {
            setMonster((prev: any) => prev ? { ...prev, hp: data.hp } : prev);
            setFlash(true); playSound(audioCtxRef.current, 'hit'); setTimeout(() => setFlash(false), 200);
        });
        newSocket.on('monster_attack', (dmg) => {
            playSound(audioCtxRef.current, 'hurt');
            setPlayerHp(prev => { const n = prev - dmg; if (n <= 0) { playSound(audioCtxRef.current, 'death'); setScreen('dead'); return 0; } return n; });
            setShake(true); setCombo(0); setTimeout(() => setShake(false), 300);
        });
        newSocket.on('monster_defeated', (data) => {
            setGold(prev => prev + data.reward.gold); setMonster(null); playSound(audioCtxRef.current, 'defeat');
            const me = data.players[newSocket.id as string];
            if (me) { setXp(me.xp); setPlayerLvl(me.level); setDamage(10 + (me.level * 2)); }
        });
        newSocket.on('game_win', () => { setScreen('victory'); playSound(audioCtxRef.current, 'levelup'); });
        newSocket.on('lobby_chat', (msg) => setChatHistory(prev => [...prev, msg]));
        return () => { newSocket.disconnect(); };
    }, [mode, username]);

    // Death animation
    useEffect(() => {
        if (screen === 'dead') { setDeathOpacity(0); const t = setTimeout(() => setDeathOpacity(1), 50); return () => clearTimeout(t); }
        else setDeathOpacity(0);
    }, [screen]);

    // ─── TYPING HANDLER ───
    const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
        ensureAudio();
        const val = e.target.value.toUpperCase();
        setTypedVal(val);
        if (currentWord && !currentWord.startsWith(val)) setCombo(0);

        if (val === currentWord && monster) {
            setTypedVal("");
            const activeCombo = combo;
            setCombo(c => c + 1);
            if (activeCombo > 0) playSound(audioCtxRef.current, 'combo');

            if (mode === 'singleplayer') {
                playSound(audioCtxRef.current, 'hit');
                setFlash(true); setTimeout(() => setFlash(false), 200);
                const finalDamage = damage + (activeCombo * 5);
                const newHp = monster.hp - finalDamage;
                if (newHp <= 0) {
                    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
                    playSound(audioCtxRef.current, 'defeat');
                    setGold(prev => prev + monster.reward.gold);
                    setMonstersKilled(prev => prev + 1);
                    setXp(prev => {
                        const newXp = prev + monster.reward.xp;
                        if (newXp >= xpToNext) {
                            const nl = playerLvl + 1;
                            setPlayerLvl(nl); setDamage(10 + (nl * 2));
                            setPlayerMaxHp(100 + (nl * 10)); setPlayerHp(100 + (nl * 10));
                            setXpToNext(Math.floor(100 * Math.pow(1.5, nl - 1)));
                            setLevelUpFlash(true); setTimeout(() => setLevelUpFlash(false), 1500);
                            playSound(audioCtxRef.current, 'levelup');
                            return newXp - xpToNext;
                        }
                        return newXp;
                    });
                    // LEVEL COMPLETE
                    setMonster(null);
                    const nextUnlock = currentLevel + 1;
                    if (nextUnlock > unlockedLevel) {
                        setUnlockedLevel(nextUnlock);
                        saveProgress(nextUnlock);
                    }
                    setScreen('levelcomplete');
                } else {
                    setMonster({ ...monster, hp: newHp });
                    setCurrentWord(pickWord());
                }
            } else {
                if (socket) {
                    const finalDamage = damage + (activeCombo * 5);
                    socket.emit('player_attack', { lobbyId: "random_global", word: currentWord, damage: finalDamage, attacker: username });
                }
            }
        }
    };

    const sendChat = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && chatInput.trim() !== '') {
            socket?.emit('lobby_chat', { lobbyId: "random_global", sender: username, text: chatInput });
            setChatInput(""); setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    // ═══ RENDER ═══
    const sidebarPadding = mode === 'random' ? 'pl-72' : 'pl-0';

    // ─── LEVEL SELECT SCREEN (SP) ───
    if (mode === 'singleplayer' && screen === 'levelselect') {
        return (
            <div className="absolute inset-0 flex flex-col bg-[#1a1a2e] overflow-hidden z-20" onClick={ensureAudio}>
                <header className="h-14 bg-[#8B5A2B] flex items-center justify-between px-4 shrink-0 border-b-4 border-black">
                    <div className="text-xs text-white">⚔️ {username}&apos;s ADVENTURE</div>
                    <div className="flex gap-2 items-center">
                        <span className="text-[9px] text-yellow-400">🪙 {gold}</span>
                        <span className="text-[9px] text-[#39FF14]">LVL {playerLvl}</span>
                        <button onClick={() => router.push('/')} className="mc-btn bg-red-500 text-[10px] px-3 py-1">BACK</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    <h2 className="text-center text-sm text-yellow-400 mb-4">SELECT A LEVEL</h2>
                    <div className="grid grid-cols-5 gap-3 max-w-3xl mx-auto">
                        {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
                            const lvl = i + 1;
                            const isBoss = lvl % 10 === 0;
                            const isUnlocked = lvl <= unlockedLevel;
                            const isCompleted = lvl < unlockedLevel;
                            const m = getMonsterForLevel(lvl);
                            return (
                                <button
                                    key={lvl}
                                    disabled={!isUnlocked}
                                    onClick={() => isUnlocked && startQuest(lvl)}
                                    className={`relative flex flex-col items-center p-2 blocky-border transition-all ${
                                        isBoss ? 'col-span-5' : ''
                                    } ${
                                        !isUnlocked ? 'bg-gray-800 opacity-50 cursor-not-allowed' :
                                        isCompleted ? 'bg-green-900 hover:bg-green-800' :
                                        isBoss ? 'bg-red-900 hover:bg-red-800 ring-2 ring-yellow-500 animate-pulse' :
                                        'bg-gray-700 hover:bg-gray-600 ring-1 ring-yellow-400'
                                    }`}
                                >
                                    {!isUnlocked && <span className="absolute inset-0 flex items-center justify-center text-2xl z-10">🔒</span>}
                                    <span className="text-[8px] text-gray-400 mb-1">{isBoss ? '👑 BOSS' : `LVL ${lvl}`}</span>
                                    <span className={`text-2xl ${isBoss ? 'text-4xl' : ''} ${!isUnlocked ? 'blur-sm' : ''}`}>{m.emoji}</span>
                                    <span className={`text-[8px] text-white mt-1 ${!isUnlocked ? 'blur-sm' : ''}`}>{m.name}</span>
                                    {isUnlocked && (
                                        <span className="text-[7px] text-gray-400">HP {m.maxHp} · ATK {m.attack}</span>
                                    )}
                                    {isCompleted && <span className="absolute top-1 right-1 text-[10px]">⭐</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ─── QUEST SCREEN ───
    if (mode === 'singleplayer' && screen === 'quest') {
        const quest = getQuestForLevel(currentLevel);
        const isBoss = currentLevel % 10 === 0;
        const m = getMonsterForLevel(currentLevel);
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a2e] z-20 px-4" onClick={ensureAudio}>
                <div className="bg-gray-800/95 blocky-border p-8 max-w-lg w-full flex flex-col items-center">
                    <div className="text-[9px] text-gray-400 mb-2">{isBoss ? '👑 BOSS CHALLENGE' : `LEVEL ${currentLevel} QUEST`}</div>
                    <div className="text-4xl mb-3">{m.emoji}</div>
                    <div className="text-xs text-white mb-1">{m.name}</div>
                    <div className="text-[8px] text-gray-400 mb-4">HP {m.maxHp} · ATK {m.attack} · 🪙{m.reward.gold}</div>

                    <div className="bg-black/50 blocky-border-inner p-4 w-full mb-4">
                        <div className="text-[10px] text-yellow-400 mb-2">📜 Answer to unlock this fight:</div>
                        <div className="text-xs text-white mb-3">{quest.q}</div>
                        {questHintShown && (
                            <div className="text-[9px] text-cyan-400 mb-2">💡 Hint: {quest.hint}</div>
                        )}
                    </div>

                    <input
                        type="text"
                        value={questAnswer}
                        onChange={e => { setQuestAnswer(e.target.value); setQuestError(""); }}
                        onKeyDown={e => e.key === 'Enter' && submitQuest()}
                        placeholder="TYPE YOUR ANSWER..."
                        autoFocus
                        className="w-full bg-black text-white text-sm p-3 blocky-border-inner uppercase text-center mb-3 focus:outline-none focus:border-yellow-400"
                    />

                    {questError && <div className="text-[10px] text-red-500 mb-2">{questError}</div>}

                    <div className="flex gap-2 w-full">
                        <button onClick={() => setScreen('levelselect')} className="mc-btn bg-gray-600 text-[10px] px-4 py-2 flex-1">BACK</button>
                        <button onClick={submitQuest} className="mc-btn bg-green-600 text-[10px] px-4 py-2 flex-1">SUBMIT</button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── LEVEL COMPLETE SCREEN ───
    if (mode === 'singleplayer' && screen === 'levelcomplete') {
        const m = getMonsterForLevel(currentLevel);
        const isBoss = currentLevel % 10 === 0;
        const hasNext = currentLevel < TOTAL_LEVELS;
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[100] px-4">
                <div className={`text-3xl mb-2 ${isBoss ? 'text-5xl' : ''}`} style={{ animation: 'death-appear 0.5s ease-out' }}>
                    {isBoss ? '👑' : '⭐'}
                </div>
                <div className="text-2xl text-yellow-400 mb-2" style={{ textShadow: '0 0 20px #ffd700', animation: 'death-appear 0.8s ease-out' }}>
                    {isBoss ? 'BOSS DEFEATED!' : `LEVEL ${currentLevel} COMPLETE!`}
                </div>
                <div className="text-xs text-gray-300 mb-1">Defeated {m.name} {m.emoji}</div>
                <div className="text-[10px] text-yellow-400 mb-6">+{m.reward.gold} Gold · +{m.reward.xp} XP</div>

                {hasNext && (
                    <div className="text-[9px] text-green-400 mb-4" style={{ animation: 'death-appear 1.2s ease-out' }}>
                        🔓 Level {currentLevel + 1} Unlocked!
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={() => setScreen('levelselect')} className="mc-btn blocky-border bg-gray-700 text-white px-6 py-3 text-[10px]">
                        LEVEL MAP
                    </button>
                    {hasNext && (
                        <button onClick={() => startQuest(currentLevel + 1)} className="mc-btn blocky-border bg-green-600 text-white px-6 py-3 text-[10px]">
                            NEXT LEVEL →
                        </button>
                    )}
                    {!hasNext && (
                        <div className="text-sm text-yellow-400" style={{ textShadow: '0 0 20px #ffd700' }}>
                            🏆 ALL LEVELS COMPLETE!
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col bg-[#87CEEB] overflow-hidden z-20" onClick={ensureAudio}>
            {/* ═══ DEATH SCREEN ═══ */}
            {screen === 'dead' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center"
                    style={{ background: `rgba(139,0,0,${0.7 * deathOpacity})`, transition: 'all 1.5s ease-in', opacity: deathOpacity }}>
                    <div className="text-4xl md:text-6xl text-red-500 mb-4 death-text-glow" style={{ textShadow: '0 0 20px #f00,0 0 40px #f00,0 0 80px #900', animation: 'death-appear 1s ease-out' }}>
                        YOU DIED!
                    </div>
                    <div className="text-sm text-gray-300 mb-2">Level {currentLevel} · {monstersKilled} Monsters Killed</div>
                    <div className="text-xs text-gray-400 mb-8">🪙 {gold} Gold · LVL {playerLvl}</div>
                    <button onClick={() => { setScreen(mode === 'singleplayer' ? 'levelselect' : 'waiting'); setPlayerHp(playerMaxHp); }}
                        className="mc-btn blocky-border bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 text-sm">
                        {mode === 'singleplayer' ? 'LEVEL MAP' : 'RETURN TO MENU'}
                    </button>
                    {mode === 'singleplayer' && (
                        <button onClick={() => startQuest(currentLevel)}
                            className="mc-btn blocky-border bg-red-800 text-white px-8 py-3 text-xs mt-3">
                            RETRY LEVEL {currentLevel}
                        </button>
                    )}
                </div>
            )}

            {/* ═══ VICTORY ═══ */}
            {screen === 'victory' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80">
                    <div className="text-3xl md:text-5xl text-yellow-400 mb-4" style={{ textShadow: '0 0 30px #ffd700,0 0 60px #ffa500', animation: 'death-appear 1s ease-out' }}>
                        ⚔️ VICTORY! ⚔️
                    </div>
                    <div className="text-lg text-white mb-8">All monsters vanquished!</div>
                    <button onClick={() => router.push('/')} className="mc-btn blocky-border bg-[#55AA55] text-white px-8 py-4 text-sm">RETURN TO MENU</button>
                </div>
            )}

            {/* ═══ LEVEL UP FLASH ═══ */}
            {levelUpFlash && (
                <div className="absolute inset-0 z-[90] flex items-center justify-center pointer-events-none"
                    style={{ background: 'radial-gradient(circle,rgba(255,215,0,0.4) 0%,transparent 70%)', animation: 'levelup-flash 1.5s ease-out forwards' }}>
                    <div className="text-3xl text-yellow-300" style={{ textShadow: '0 0 20px #ffd700', animation: 'death-appear 0.5s ease-out' }}>
                        ⬆️ LEVEL UP! LVL {playerLvl} ⬆️
                    </div>
                </div>
            )}

            {/* Multiplayer sidebar */}
            {mode === 'random' && (
                <div className="absolute top-20 left-4 w-64 bg-gray-800/95 p-3 flex flex-col gap-2 z-40 blocky-border">
                    <h3 className="text-[10px] text-yellow-400">LOBBY (RANDOM)</h3>
                    <div className="text-[8px] text-gray-300 flex flex-col gap-1">
                        {players.map(p => <div key={p.id}>👤 {p.name}</div>)}
                    </div>
                    <button className="mc-btn bg-blue-600 text-white text-[8px] py-2 mt-2" onClick={() => alert("WebRTC VC Coming Soon!")}>JOIN VOICE CHAT 🎤</button>
                    <div className="border-t border-gray-600 mt-2 flex flex-col h-40">
                        <div className="text-[8px] flex-1 overflow-y-auto flex flex-col gap-1 mt-2">
                            {chatHistory.map((c, i) => (<div key={i}><span className="text-blue-400">[{c.sender}]</span> {c.text}</div>))}
                        </div>
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={sendChat}
                            className="bg-black text-[8px] p-2 text-white blocky-border-inner focus:border-white" placeholder="Chat..." />
                    </div>
                </div>
            )}

            {/* SP sidebar */}
            {mode === 'singleplayer' && screen === 'playing' && (
                <div className="absolute top-20 left-4 w-56 bg-gray-800/95 p-3 flex flex-col gap-2 z-40 blocky-border">
                    <h3 className="text-[10px] text-yellow-400">⚔️ LEVEL {currentLevel}{currentLevel % 10 === 0 ? ' 👑 BOSS' : ''}</h3>
                    <div className="text-[8px] text-gray-300">
                        <div>👤 {username}</div>
                        <div className="mt-1">🗡️ Slain: {monstersKilled}</div>
                    </div>
                    <div className="border-t border-gray-600 mt-2 pt-2">
                        <div className="text-[8px] text-gray-400">XP: {xp}/{xpToNext}</div>
                        <div className="w-full h-2 bg-black blocky-border-inner mt-1 overflow-hidden">
                            <div className="h-full bg-[#39FF14] transition-all duration-300" style={{ width: `${Math.min(100, (xp / xpToNext) * 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={`h-16 bg-[#8B5A2B] flex items-center justify-between px-4 ${sidebarPadding} shrink-0 border-b-4 border-black z-20`}>
                <div className="flex items-center gap-4">
                    <div className="text-xs text-white font-bold">LVL {playerLvl}</div>
                    <div className="text-[10px] text-red-500">HP {Math.max(0, playerHp)}/{playerMaxHp}</div>
                    <div className="text-[10px] text-yellow-400">GOLD {gold}</div>
                    <div className="text-[10px] text-[#39FF14]">XP {xp}</div>
                    {combo > 1 && <div className="text-sm text-[#FF00FF] font-bold bounce ml-4">COMBO x{combo}!</div>}
                </div>
                <div className="flex gap-2">
                    {mode === 'random' && screen === 'waiting' && (
                        <button onClick={() => { ensureAudio(); socket?.emit('start_game', "random_global"); }} className="mc-btn bg-green-500 text-xs p-2">START RAID</button>
                    )}
                    {mode === 'singleplayer' && screen === 'playing' && (
                        <button onClick={() => { if (attackTimerRef.current) clearTimeout(attackTimerRef.current); setScreen('levelselect'); setPlayerHp(playerMaxHp); }}
                            className="mc-btn bg-yellow-600 text-xs p-2">LEVEL MAP</button>
                    )}
                    <button onClick={() => router.push('/')} className="mc-btn bg-red-500 text-xs p-2">LEAVE</button>
                </div>
            </header>

            {/* Combat Area */}
            <div className={`flex-1 flex flex-col items-center justify-center relative ${sidebarPadding} ${shake ? 'animate-shake bg-red-900/40' : ''}`}>
                <div className="absolute bottom-0 w-full h-1/3 bg-[#55AA55] border-t-8 border-[#3E8E3E] -z-10"></div>

                {screen === 'waiting' && !monster && mode === 'random' && (
                    <div className="flex flex-col items-center text-center">
                        <div className="text-4xl mb-4">🛡️</div>
                        <div className="text-sm text-[#8B5A2B] mb-2">MULTIPLAYER RAID</div>
                        <div className="text-[10px] text-gray-600">Press START RAID to begin!</div>
                    </div>
                )}

                {monster && (
                    <div className={`flex flex-col items-center relative transition-transform ${flash ? 'animate-flash opacity-75 scale-95' : ''}`}>
                        <div className="text-[10px] drop-shadow-md mb-2">{monster.name} {monster.isBoss ? '👑' : ''}</div>
                        <div className="w-64 h-4 bg-black blocky-border-inner mb-4 relative overflow-hidden">
                            <div className="h-full bg-red-600 transition-all duration-300 ease-out" style={{ width: `${Math.max(0, (monster.hp / monster.maxHp) * 100)}%` }}></div>
                        </div>
                        <div className={`w-48 h-48 bg-gray-600 blocky-border flex items-center justify-center text-6xl shadow-xl bounce ${monster.isBoss ? 'ring-4 ring-yellow-500 w-56 h-56' : ''}`}>
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

                {!monster && screen === 'playing' && (
                    <div className="text-lg text-yellow-400 bounce">Next monster incoming...</div>
                )}
            </div>

            {/* Input */}
            <div className={`h-24 bg-gray-500 flex items-center justify-center ${sidebarPadding} shrink-0 border-t-4 border-white pb-4`}>
                <input ref={inputRef} type="text" value={typedVal} onChange={handleType}
                    disabled={screen !== 'playing' || !monster}
                    className="w-full max-w-xl h-16 bg-black text-white text-2xl font-pixel p-4 outline-none border-4 border-white focus:border-yellow-400 uppercase placeholder-gray-600 text-center disabled:opacity-50"
                    placeholder={screen === 'playing' ? "TYPE TO ATTACK..." : "WAITING..."} autoFocus />
            </div>
        </div>
    );
}
