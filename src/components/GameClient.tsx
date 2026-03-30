"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { pickWordForLevel, WordInfo, ElementType } from "@/utils/words";
import { useSettings } from "@/components/SettingsProvider";
import dynamic from 'next/dynamic';

const BabylonArena = dynamic(() => import('@/components/BabylonArena'), { ssr: false });

// ─── Sound Effects ───
function createAudioCtx() {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    return Ctx ? new Ctx() : null;
}
function playSound(ctx: AudioContext | null, vol: number, type: 'hit' | 'hurt' | 'death' | 'levelup' | 'defeat' | 'combo' | 'unlock' | 'wrong') {
    if (!ctx || vol <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const v = vol;
    osc.connect(gain); gain.connect(ctx.destination);
    switch (type) {
        case 'hit':
            osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3 * v, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); break;
        case 'hurt':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.4 * v, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); break;
        case 'death':
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.5);
            gain.gain.setValueAtTime(0.5 * v, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5); break;
        case 'levelup':
            osc.type = 'sine'; osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
            osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3 * v, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5); break;
        case 'defeat':
            osc.type = 'square'; osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25 * v, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4); break;
        case 'combo':
            osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.2 * v, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08); break;
        case 'unlock':
            osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(554, ctx.currentTime + 0.15); osc.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.45);
            gain.gain.setValueAtTime(0.3 * v, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.7);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.7); break;
        case 'wrong':
            osc.type = 'square'; osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.3 * v, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); break;
    }
}

// ─── Level Data ───
const REGULAR_MONSTERS = [
    { name: "Slime", emoji: "🟩", weakness: 'NATURE' as ElementType }, 
    { name: "Spider", emoji: "🕷️", weakness: 'WATER' as ElementType },
    { name: "Skeleton", emoji: "💀", weakness: 'FIRE' as ElementType }, 
    { name: "Zombie", emoji: "🧟", weakness: 'FIRE' as ElementType },
    { name: "Creeper", emoji: "💣", weakness: 'WATER' as ElementType }, 
    { name: "Enderman", emoji: "👾", weakness: 'NATURE' as ElementType },
    { name: "Blaze", emoji: "🔥", weakness: 'WATER' as ElementType }, 
    { name: "Witch", emoji: "🧙", weakness: 'FIRE' as ElementType },
    { name: "Phantom", emoji: "👻", weakness: 'NATURE' as ElementType },
];

const BOSSES = [
    { name: "Wither", emoji: "💀", title: "THE WITHER", weakness: 'FIRE' as ElementType },
    { name: "Ender Dragon", emoji: "🐉", title: "THE ENDER DRAGON", weakness: 'WATER' as ElementType },
    { name: "Warden", emoji: "🗿", title: "THE WARDEN", weakness: 'NATURE' as ElementType },
    { name: "Wither Storm", emoji: "🌪️", title: "THE WITHER STORM", weakness: 'FIRE' as ElementType },
];

const CLASS_DATA: Record<string, { name: string, hpBonus: number, dmgBonus: number, ability: string }> = {
    "heroA": { name: "Warrior", hpBonus: 50, dmgBonus: 5, ability: "Crushing Blow: High base damage." },
    "heroB": { name: "Mage", hpBonus: -20, dmgBonus: 15, ability: "Arcane Core: Massive elemental bonus." },
    "stella": { name: "Rogue", hpBonus: 0, dmgBonus: 0, ability: "Quick Strike: Faster combo scaling." },
    "realistic_female": { name: "Rogue", hpBonus: 0, dmgBonus: 0, ability: "Quick Strike: Faster combo scaling." },
};

type MonsterInfo = {
    name: string;
    emoji: string;
    isBoss: boolean;
    weakness?: ElementType;
    maxHp: number;
    attack: number;
    speed: number;
    reward: { gold: number; xp: number };
    hp?: number;
};

type LobbyPlayer = {
    id: string;
    name: string;
    isAlive: boolean;
    level: number;
    xp: number;
    dbId?: string;
};

type LobbyChatMessage = { sender: string; text: string };

function getPlayerClass(character: string) {
    if (character.toLowerCase().includes("stella")) return CLASS_DATA["stella"];
    if (character.toLowerCase().includes("female")) return CLASS_DATA["realistic_female"];
    return CLASS_DATA[character] || CLASS_DATA["heroA"];
}

function getMonsterForLevel(lvl: number) {
    const isBoss = lvl % 10 === 0;
    
    // Logarithmic speed curve: max(1500, 4000 - 800 * ln(lvl))
    const calcSpeed = Math.max(1200, Math.floor(4000 - 800 * Math.log(lvl)));

    if (isBoss) {
        const bossIdx = Math.floor(lvl / 10) - 1;
        const boss = BOSSES[bossIdx % BOSSES.length];
        let scale = 1 + Math.floor(bossIdx / BOSSES.length) * 0.5;
        
        // Special scaling and stats for Wither Storm at high levels
        if (boss.name === "Wither Storm") scale *= 2.5;

        return {
            name: boss.title, emoji: boss.emoji, isBoss: true,
            weakness: boss.weakness,
            maxHp: Math.floor(500 * scale * (1 + lvl * 0.05)),
            attack: Math.floor(20 + lvl * 1.5 * (boss.name === "Wither Storm" ? 2 : 1)),
            speed: Math.max(800, calcSpeed - 600), // Bosses attack faster
            reward: { gold: 200 + lvl * 20, xp: 400 + lvl * 40 }
        };
    }

    const m = REGULAR_MONSTERS[(lvl - 1) % REGULAR_MONSTERS.length];
    return {
        name: m.name, emoji: m.emoji, isBoss: false, weakness: m.weakness,
        maxHp: Math.floor(60 + lvl * 15),
        attack: Math.floor(3 + lvl * 1.2),
        speed: calcSpeed,
        reward: { gold: 5 + lvl * 3, xp: 10 + lvl * 5 }
    };
}

const TOTAL_LEVELS = 40;
const STORAGE_KEY = 'kk-savedata';

interface SaveData {
    unlockedLevel: number;
    playerLvl: number;
    gold: number;
    xp: number;
    inventory: {
        potions: number;
        freezes: number;
        shields: number;
        doubleXp: number;
    };
    streak: number;
    lastPlayed: string;
    dailyCompleted: boolean;
    achievements: {
        combo10: boolean;
        wpm80: boolean;
        kills100: boolean;
    }
}

const DEFAULT_SAVE: SaveData = {
    unlockedLevel: 1, playerLvl: 1, gold: 0, xp: 0,
    inventory: { potions: 0, freezes: 0, shields: 0, doubleXp: 0 },
    streak: 0, lastPlayed: "", dailyCompleted: false,
    achievements: { combo10: false, wpm80: false, kills100: false }
};

function loadSaveData(): SaveData {
    if (typeof window === 'undefined') return DEFAULT_SAVE;
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v) return { ...DEFAULT_SAVE, ...JSON.parse(v) };
    } catch(e) {}
    
    // Migration from old storage
    const oldV = localStorage.getItem('kk-progress');
    if (oldV) {
        const parsed = parseInt(oldV, 10);
        return { ...DEFAULT_SAVE, unlockedLevel: parsed > 0 ? parsed : 1 };
    }
    return DEFAULT_SAVE;
}

function saveGameData(data: Partial<SaveData>) {
    if (typeof window === 'undefined') return;
    const current = loadSaveData();
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ═══════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════
export default function GameClient({ mode, username, character = "heroA" }: { mode: 'singleplayer' | 'random', username: string, character?: string }) {
    const router = useRouter();
    const audioCtxRef = useRef<AudioContext | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const { sfxVolume, setSettingsOpen, particles } = useSettings();
    const pClass = getPlayerClass(character);

    // Game screens: 'levelselect' | 'playing' | 'dead' | 'victory' | 'levelcomplete' | 'waiting'
    const [screen, setScreen] = useState<string>(mode === 'singleplayer' ? 'levelselect' : 'waiting');
    const [unlockedLevel, setUnlockedLevel] = useState(1);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [currentWave, setCurrentWave] = useState(1);
    const [maxWaves, setMaxWaves] = useState(1);

    // Player stats
    const [playerLvl, setPlayerLvl] = useState(1);
    const [playerHp, setPlayerHp] = useState(100);
    const [playerMaxHp, setPlayerMaxHp] = useState(100);
    const [gold, setGold] = useState(0);
    const [xp, setXp] = useState(0);
    const [xpToNext, setXpToNext] = useState(100);
    const [damage, setDamage] = useState(10);
    const [inventory, setInventory] = useState({ potions: 0, freezes: 0, shields: 0, doubleXp: 0 });
    const [streak, setStreak] = useState(0);
    const [combo, setCombo] = useState(0);
    const [shake, setShake] = useState(false);
    const [flash, setFlash] = useState(false); // Used as isMonsterHit
    const [isPlayerAttacking, setIsPlayerAttacking] = useState(false);
    const [playerAttackKey, setPlayerAttackKey] = useState(0);
    const [deathOpacity, setDeathOpacity] = useState(0);
    const [levelUpFlash, setLevelUpFlash] = useState(false);
    const [dailyCompleted, setDailyCompleted] = useState(false);
    const [achievements, setAchievements] = useState(DEFAULT_SAVE.achievements);
    const [loginBonusFlash, setLoginBonusFlash] = useState("");
    const [monsterHitKey, setMonsterHitKey] = useState(0);
    
    // Mechanics tracking
    const [wpm, setWpm] = useState(0);
    const [wordStartTime, setWordStartTime] = useState(0);
    
    const isFrozenRef = useRef(false);
    const hasShieldRef = useRef(false);
    const doubleXpRef = useRef(false);

    // Fight
    const [monster, setMonster] = useState<MonsterInfo | null>(null);
    const [currentWord, setCurrentWord] = useState<WordInfo | null>(null);
    const [typedVal, setTypedVal] = useState("");
    const [monstersKilled, setMonstersKilled] = useState(0);
    const attackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [attackKey, setAttackKey] = useState(0); // For resetting UI animations
    const [attackDuration, setAttackDuration] = useState(0);

    // Multiplayer
    const [players, setPlayers] = useState<LobbyPlayer[]>([]);
    const [chatHistory, setChatHistory] = useState<LobbyChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Load progress
    useEffect(() => {
        const saved = loadSaveData();
        
        // Streak Logic
        const today = new Date().toDateString();
        let isNewDay = false;
        if (saved.lastPlayed !== today) {
            isNewDay = true;
            saved.dailyCompleted = false;
            if (saved.lastPlayed) {
                const diff = new Date(today).getTime() - new Date(saved.lastPlayed).getTime();
                if (diff <= 86400000 * 2) saved.streak += 1;
                else saved.streak = 1;
            } else saved.streak = 1;
            
            // Login Bonus
            let bonusGold = 10;
            if (saved.streak >= 2) bonusGold = 50;
            if (saved.streak >= 5) { bonusGold = 200; saved.inventory.potions += 1; }
            saved.gold += bonusGold;
            saved.lastPlayed = today;
            
            saveGameData(saved);
        }

        setUnlockedLevel(saved.unlockedLevel);
        setPlayerLvl(saved.playerLvl);
        setGold(saved.gold);
        setXp(saved.xp);
        setInventory(saved.inventory);
        setStreak(saved.streak);
        setDailyCompleted(saved.dailyCompleted);
        setAchievements(saved.achievements);
        
        if (isNewDay) {
            setLoginBonusFlash(`DAY ${saved.streak} LOGIN: +BONUS!`);
            setTimeout(() => setLoginBonusFlash(""), 4000);
        }
        
        const dmg = 10 + (saved.playerLvl * 2) + pClass.dmgBonus;
        const hp = 100 + (saved.playerLvl * 10) + pClass.hpBonus;
        setDamage(dmg);
        setPlayerMaxHp(hp);
        setPlayerHp(hp);
        setXpToNext(Math.floor(100 * Math.pow(1.5, saved.playerLvl - 1)));
    }, [character, pClass.dmgBonus, pClass.hpBonus]);

    const ensureAudio = useCallback(() => {
        if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    }, []);



    // ─── FIGHT LOGIC ───
    const startFight = (lvl: number) => {
        ensureAudio();
        setCurrentLevel(lvl);
        setScreen('playing');
        setCombo(0);
        setTypedVal("");
        
        let waves = 1;
        if (lvl % 10 !== 0) {
            if (lvl <= 10) waves = 2;
            else if (lvl <= 20) waves = 3;
            else waves = 4;
        }
        setMaxWaves(waves);
        setCurrentWave(1);
        setWpm(0);
        setWordStartTime(Date.now());
        
        setInventory(inv => {
            if (inv.doubleXp > 0) {
                doubleXpRef.current = true;
                return { ...inv, doubleXp: inv.doubleXp - 1 };
            }
            doubleXpRef.current = false;
            return inv;
        });

        const m = getMonsterForLevel(lvl);
        const monsterData = { ...m, hp: m.maxHp };
        setMonster(monsterData);
        setCurrentWord(pickWordForLevel(lvl));
        setPlayerHp(playerMaxHp);
    };

    // Attack timer
    const spStartAttackTimer = useCallback(function spStartAttackTimer(m: MonsterInfo) {
        if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
        setAttackKey(prev => prev + 1);
        setAttackDuration(m.speed);
        attackTimerRef.current = setTimeout(() => {
            if (isFrozenRef.current) {
                spStartAttackTimer(m);
                return;
            }
            if (hasShieldRef.current) {
                hasShieldRef.current = false; // consume shield
                playSound(audioCtxRef.current, sfxVolume, 'hit');
                setFlash(true); setTimeout(() => setFlash(false), 200);
                spStartAttackTimer(m);
                return;
            }

            playSound(audioCtxRef.current, sfxVolume, 'hurt');
            setShake(true);
            setCombo(0);
            setTimeout(() => setShake(false), 300);
            setPlayerHp(prev => {
                const newHp = prev - m.attack;
                if (newHp <= 0) {
                    playSound(audioCtxRef.current, sfxVolume, 'death');
                    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
                    setScreen('dead');
                    return 0;
                }
                spStartAttackTimer(m);
                return newHp;
            });
        }, m.speed);
    }, [sfxVolume]);

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
        newSocket.on('update_players', (p: LobbyPlayer[]) => setPlayers(p));
        newSocket.on('spawn_monster', (m) => { setMonster(m); setTypedVal(""); });
        newSocket.on('new_word', (w) => { setCurrentWord(w); setTypedVal(""); });
        newSocket.on('monster_damaged', (data) => {
            setMonsterHitKey(k => k + 1);
            setMonster((prev) => prev ? { ...prev, hp: data.hp as number } : prev);
            setFlash(true); playSound(audioCtxRef.current, sfxVolume, 'hit'); setTimeout(() => setFlash(false), 200);
        });
        newSocket.on('monster_attack', (dmg) => {
            playSound(audioCtxRef.current, sfxVolume, 'hurt');
            setPlayerHp(prev => { const n = prev - dmg; if (n <= 0) { playSound(audioCtxRef.current, sfxVolume, 'death'); setScreen('dead'); return 0; } return n; });
            setShake(true); setCombo(0); setTimeout(() => setShake(false), 300);
        });
        newSocket.on('monster_defeated', (data) => {
            setGold(prev => prev + data.reward.gold); setMonster(null); playSound(audioCtxRef.current, sfxVolume, 'defeat');
            const me = data.players[newSocket.id as string];
            if (me) { setXp(me.xp); setPlayerLvl(me.level); setDamage(10 + (me.level * 2)); }
        });
        newSocket.on('game_win', () => { setScreen('victory'); playSound(audioCtxRef.current, sfxVolume, 'levelup'); });
        newSocket.on('lobby_chat', (msg) => setChatHistory(prev => [...prev, msg]));
        return () => { newSocket.disconnect(); };
    }, [mode, username]);

    // Death animation
    useEffect(() => {
        if (screen === 'dead') { setDeathOpacity(0); const t = setTimeout(() => setDeathOpacity(1), 50); return () => clearTimeout(t); }
        else setDeathOpacity(0);
    }, [screen]);

    // Save on Level Complete
    useEffect(() => {
        if (screen === 'levelcomplete') {
            const isDaily = currentLevel === 99;
            if (isDaily) setDailyCompleted(true);
            saveGameData({ 
                unlockedLevel: isDaily ? unlockedLevel : Math.max(unlockedLevel, currentLevel + 1), 
                playerLvl, gold, xp, inventory, streak, dailyCompleted: isDaily || dailyCompleted, achievements 
            });
        }
    }, [screen, unlockedLevel, playerLvl, gold, xp, inventory, streak, currentLevel, dailyCompleted, achievements]);

    // ─── TYPING HANDLER ───
    const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
        ensureAudio();
        const val = e.target.value.toUpperCase();
        setTypedVal(val);
        if (currentWord && !currentWord.text.startsWith(val)) setCombo(0);

        if (currentWord && val === currentWord.text && monster) {
            setTypedVal("");
            const activeCombo = combo;
            const comboGain = pClass.name === "Rogue" ? 2 : 1;
            setCombo(c => c + comboGain);
            if (activeCombo > 0) playSound(audioCtxRef.current, sfxVolume, 'combo');

            // Basic instantaneous WPM calculation: (chars / 5) / (minutes)
            const minutesElapsed = (Date.now() - wordStartTime) / 60000;
            if (minutesElapsed > 0.01) {
                const currentWpm = Math.floor((currentWord.text.length / 5) / minutesElapsed);
                setWpm(prev => prev === 0 ? currentWpm : Math.floor((prev + currentWpm) / 2));
                
                // Track achievement
                if (currentWpm >= 80 && !achievements.wpm80) {
                    setAchievements(a => ({ ...a, wpm80: true }));
                    saveGameData({ achievements: { ...achievements, wpm80: true }});
                }
            }
            setWordStartTime(Date.now());
            
            if (combo >= 10 && !achievements.combo10) {
                setAchievements(a => ({ ...a, combo10: true }));
                saveGameData({ achievements: { ...achievements, combo10: true }});
            }

            if (mode === 'singleplayer') {
                setMonsterHitKey(k => k + 1);
                playSound(audioCtxRef.current, sfxVolume, 'hit');
                // Trigger Attack & Hit animations
                setIsPlayerAttacking(true); setPlayerAttackKey(k => k + 1); setTimeout(() => setIsPlayerAttacking(false), 150);
                setFlash(true); setTimeout(() => setFlash(false), 200);

                let elementalMult = 1;
                if (currentWord.element !== 'NORMAL' && currentWord.element === monster.weakness) {
                    elementalMult = pClass.name === "Mage" ? 3 : 2; // Elemental bonus
                }

                const finalDamage = (damage + (activeCombo * 5)) * elementalMult;
                const currentHp = monster.hp ?? monster.maxHp;
                const newHp = currentHp - finalDamage;
                if (newHp <= 0) {
                    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
                    playSound(audioCtxRef.current, sfxVolume, 'defeat');
                    
                    // Loot Drops
                    let extraGold = 0;
                    const roll = Math.random();
                    if (roll > 0.95) {
                        setInventory(inv => ({ ...inv, potions: inv.potions + 1 }));
                    } else if (roll > 0.85) {
                        extraGold = monster.reward.gold * 4; // 10%: Rare gem
                    } else if (roll > 0.60) {
                        extraGold = Math.floor(monster.reward.gold * 1.5); // 25%: Multiplier
                    }
                    
                    setGold(prev => prev + monster.reward.gold + extraGold);
                    setMonstersKilled(prev => prev + 1);
                    setXp(prev => {
                        const newXp = prev + monster.reward.xp;
                        if (newXp >= xpToNext) {
                            const nl = playerLvl + 1;
                            setPlayerLvl(nl); setDamage(10 + (nl * 2));
                            setPlayerMaxHp(100 + (nl * 10)); setPlayerHp(100 + (nl * 10));
                            setXpToNext(Math.floor(100 * Math.pow(1.5, nl - 1)));
                            setLevelUpFlash(true); setTimeout(() => setLevelUpFlash(false), 1500);
                            playSound(audioCtxRef.current, sfxVolume, 'levelup');
                            return newXp - xpToNext;
                        }
                        return newXp;
                    });
                    
                    if (currentWave < maxWaves) {
                        // NEXT WAVE
                        setCurrentWave(cw => cw + 1);
                        const m = getMonsterForLevel(currentLevel);
                        setMonster({ ...m, hp: m.maxHp });
                        setCurrentWord(pickWordForLevel(currentLevel));
                    } else {
                        // LEVEL COMPLETE
                        setMonster(null);
                        const nextUnlock = currentLevel + 1;
                        if (nextUnlock > unlockedLevel) {
                            setUnlockedLevel(nextUnlock);
                        }
                        setScreen('levelcomplete');
                    }
                } else {
                    setMonster({ ...monster, hp: newHp });
                    setCurrentWord(pickWordForLevel(currentLevel));
                }
            } else {
                if (socket) {
                    const finalDamage = damage + (activeCombo * 5);
                    // Let the hero lunge locally even in multiplayer.
                    setIsPlayerAttacking(true); setPlayerAttackKey(k => k + 1); setTimeout(() => setIsPlayerAttacking(false), 150);
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

    // Helper: HP bar color class
    const getHpBarClass = (current: number, max: number) => {
        const pct = current / max;
        if (pct > 0.6) return 'hp-bar-high';
        if (pct > 0.25) return 'hp-bar-mid';
        return 'hp-bar-low';
    };

    // Helper: Level difficulty color
    const getLevelColor = (lvl: number) => {
        if (lvl <= 10) return 'from-[#1a3a1a] to-[#2d5a2d]';
        if (lvl <= 20) return 'from-[#3a2a1a] to-[#5a4a2d]';
        return 'from-[#3a1a1a] to-[#5a2d2d]';
    };

    // ─── LEVEL SELECT SCREEN (SP) ───
    if (mode === 'singleplayer' && screen === 'levelselect') {
        return (
            <div className="absolute inset-0 flex flex-col bg-kingdom overflow-hidden z-20" onClick={ensureAudio}>
                {loginBonusFlash && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-yellow-700 text-white px-6 py-2 blocky-border slide-in-left animate-pulse shadow-[0_0_20px_rgba(255,215,0,0.8)]">
                        ⭐ {loginBonusFlash} ⭐
                    </div>
                )}
                <header className="h-14 bg-gradient-to-r from-[#6B3A1B] to-[#8B5A2B] flex items-center justify-between px-4 shrink-0 border-b-4 border-black shadow-lg">
                    <div className="flex flex-col slide-in-left">
                        <div className="text-[10px] text-white">⚔️ {username}</div>
                        <div className="text-[8px] text-gold uppercase tracking-widest">{pClass.name}</div>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="text-[9px] text-yellow-400 text-glow-gold">🪙 {gold}</span>
                        <span className="text-[9px] text-[#39FF14]" style={{ textShadow: '0 0 8px rgba(57,255,20,0.5)' }}>LVL {playerLvl}</span>
                        <button onClick={() => setScreen('achievements')} className="mc-btn bg-blue-700 text-[10px] px-3 py-1 slide-in-left">🏆</button>
                        <button onClick={() => setScreen('shop')} className="mc-btn bg-purple-700 text-[10px] px-3 py-1 slide-in-left">🛒 SHOP</button>
                        <button onClick={() => setSettingsOpen(true)} className="mc-btn bg-gray-700 text-[10px] px-3 py-1">⚙️</button>
                        <button onClick={() => router.push('/')} className="mc-btn bg-red-700 text-[10px] px-3 py-1">← BACK</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-end mb-6 max-w-3xl mx-auto">
                        <h2 className="text-sm text-gold text-glow-gold scale-in">⚔️ SELECT A LEVEL ⚔️</h2>
                        <button onClick={() => { if(!dailyCompleted) startFight(99); }} 
                                disabled={dailyCompleted}
                                className={`mc-btn ${dailyCompleted ? 'bg-gray-700 opacity-50' : 'bg-gradient-to-r from-yellow-600 to-yellow-500 animate-pulse'} px-4 py-2 blocky-border text-[10px]`}>
                            {dailyCompleted ? '✅ DAILY DONE' : '🔥 DAILY CHALLENGE'}
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-3 max-w-3xl mx-auto">
                        {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
                            const lvl = i + 1;
                            const isBoss = lvl % 10 === 0;
                            const isUnlocked = lvl <= unlockedLevel;
                            const isCompleted = lvl < unlockedLevel;
                            const isNext = lvl === unlockedLevel && !isCompleted;
                            const m = getMonsterForLevel(lvl);
                            return (
                                <button
                                    key={lvl}
                                    disabled={!isUnlocked}
                                    onClick={() => isUnlocked && startFight(lvl)}
                                    className={`fade-in-up relative flex flex-col items-center p-3 blocky-border transition-all duration-300 card-hover ${
                                        isBoss ? 'col-span-5' : ''
                                    } ${
                                        !isUnlocked ? 'bg-gray-900/80 opacity-40 cursor-not-allowed' :
                                        isCompleted ? `bg-gradient-to-b ${getLevelColor(lvl)} hover:brightness-125` :
                                        isBoss ? 'bg-gradient-to-b from-red-900 to-red-950 boss-glow' :
                                        isNext ? `bg-gradient-to-b ${getLevelColor(lvl)} next-level-pulse` :
                                        'bg-gray-800 hover:bg-gray-700'
                                    }`}
                                    style={{ '--delay': `${Math.min(i * 0.03, 0.8)}s` } as React.CSSProperties}
                                >
                                    {!isUnlocked && <span className="absolute inset-0 flex items-center justify-center text-2xl z-10">🔒</span>}
                                    <span className="text-[8px] text-gray-400 mb-1">{isBoss ? '👑 BOSS' : `LVL ${lvl}`}</span>
                                    <span className={`text-2xl ${isBoss ? 'text-4xl' : ''} ${!isUnlocked ? 'blur-sm' : ''} transition-transform duration-300`}>{m.emoji}</span>
                                    <span className={`text-[8px] text-white mt-1 ${!isUnlocked ? 'blur-sm' : ''}`}>{m.name}</span>
                                    {isUnlocked && (
                                        <span className="text-[7px] text-gray-500 mt-0.5">HP {m.maxHp} · ATK {m.attack}</span>
                                    )}
                                    {isCompleted && <span className="absolute top-1 right-1 text-[10px]" style={{ textShadow: '0 0 6px rgba(255,215,0,0.6)' }}>⭐</span>}
                                    {isNext && <span className="absolute -top-1 -right-1 text-[8px] bg-gold text-black px-1 rounded" style={{ textShadow: 'none' }}>NEW</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ─── ACHIEVEMENTS SCREEN ───
    if (mode === 'singleplayer' && screen === 'achievements') {
        return (
            <div className="absolute inset-0 flex flex-col bg-kingdom overflow-hidden z-[100]">
                <header className="h-14 bg-gradient-to-r from-[#1A3A5A] to-[#112233] flex items-center justify-between px-4 shrink-0 border-b-4 border-black shadow-lg h-16">
                    <div className="text-xl text-yellow-400 text-glow-gold">🏆 ACHIEVEMENTS</div>
                    <button onClick={() => setScreen('levelselect')} className="mc-btn bg-red-700 text-xs px-4 py-2">← BACK</button>
                </header>
                <div className="flex-1 p-8 flex flex-col gap-4 max-w-2xl mx-auto overflow-y-auto w-full">
                    <div className={`p-4 blocky-border flex items-center gap-4 ${achievements.combo10 ? 'bg-gradient-to-r from-yellow-700/80 to-yellow-900/80' : 'bg-gray-800 opacity-50'}`}>
                        <div className="text-4xl">{achievements.combo10 ? '🔥' : '🔒'}</div>
                        <div>
                            <div className="text-sm text-gold">Combo Master</div>
                            <div className="text-[10px] text-gray-300">Reach a 10x Combo without making a mistake.</div>
                        </div>
                    </div>
                    <div className={`p-4 blocky-border flex items-center gap-4 ${achievements.wpm80 ? 'bg-gradient-to-r from-green-700/80 to-green-900/80' : 'bg-gray-800 opacity-50'}`}>
                        <div className="text-4xl">{achievements.wpm80 ? '⚡' : '🔒'}</div>
                        <div>
                            <div className="text-sm text-emerald text-glow-green">Speed Demon</div>
                            <div className="text-[10px] text-gray-300">Type at 80+ Words Per Minute during combat.</div>
                        </div>
                    </div>
                    <div className={`p-4 blocky-border flex items-center gap-4 ${monstersKilled >= 100 ? 'bg-gradient-to-r from-red-700/80 to-red-900/80' : 'bg-gray-800 opacity-50'}`}>
                        <div className="text-4xl">{monstersKilled >= 100 ? '⚔️' : '🔒'}</div>
                        <div>
                            <div className="text-sm text-red-500">Slayer</div>
                            <div className="text-[10px] text-gray-300">Defeat 100 Monsters (Progress: {monstersKilled}/100)</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    // ─── SHOP SCREEN ───
    if (mode === 'singleplayer' && screen === 'shop') {
        const buyItem = (itemKey: keyof typeof inventory, cost: number) => {
            if (gold >= cost) {
                setGold(g => g - cost);
                setInventory(inv => ({ ...inv, [itemKey]: inv[itemKey] + 1 }));
                saveGameData({ gold: gold - cost, inventory: { ...inventory, [itemKey]: inventory[itemKey] + 1 } });
            } else {
                setShake(true);
                setTimeout(() => setShake(false), 300);
            }
        };

        return (
            <div className="absolute inset-0 flex flex-col bg-kingdom overflow-hidden z-[100]">
                <header className="h-14 bg-gradient-to-r from-[#800080] to-[#4B0082] flex items-center justify-between px-4 shrink-0 border-b-4 border-black shadow-lg h-16">
                    <div className="text-xl text-yellow-400 text-glow-gold">🛒 ALCHEMIST SHOP</div>
                    <div className="flex gap-3 items-center">
                        <span className="text-lg text-yellow-400 text-glow-gold">🪙 {gold}</span>
                        <button onClick={() => setScreen('levelselect')} className="mc-btn bg-red-700 text-xs px-4 py-2">← LEAVE</button>
                    </div>
                </header>
                <div className={`flex-1 p-8 grid grid-cols-2 gap-6 max-w-4xl mx-auto overflow-y-auto w-full ${shake ? 'animate-shake' : ''}`}>
                    
                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 blocky-border p-6 flex flex-col items-center card-hover">
                        <div className="text-5xl mb-2 bounce">🧪</div>
                        <h3 className="text-red-400 text-sm mb-1">Health Potion</h3>
                        <p className="text-[10px] text-gray-400 text-center h-8">Restores 50 HP instantly during combat. Press &apos;1&apos; to use.</p>
                        <div className="text-xs text-yellow-400 my-2">Cost: 50g</div>
                        <div className="text-[9px] text-gray-500 mb-2">Owned: {inventory.potions}</div>
                        <button onClick={() => buyItem('potions', 50)} className={`mc-btn ${gold >= 50 ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 opacity-50'} text-xs px-6 py-2`}>BUY</button>
                    </div>

                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 blocky-border p-6 flex flex-col items-center card-hover">
                        <div className="text-5xl mb-2 bounce">⌛</div>
                        <h3 className="text-blue-400 text-sm mb-1">Time Freeze</h3>
                        <p className="text-[10px] text-gray-400 text-center h-8">Stops enemy attacks for 5 seconds. Press &apos;2&apos; to use.</p>
                        <div className="text-xs text-yellow-400 my-2">Cost: 100g</div>
                        <div className="text-[9px] text-gray-500 mb-2">Owned: {inventory.freezes}</div>
                        <button onClick={() => buyItem('freezes', 100)} className={`mc-btn ${gold >= 100 ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 opacity-50'} text-xs px-6 py-2`}>BUY</button>
                    </div>

                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 blocky-border p-6 flex flex-col items-center card-hover">
                        <div className="text-5xl mb-2 bounce">📜</div>
                        <h3 className="text-emerald text-sm mb-1">Double XP Scroll</h3>
                        <p className="text-[10px] text-gray-400 text-center h-8">Double XP from all monsters in a single level. Auto-used.</p>
                        <div className="text-xs text-yellow-400 my-2">Cost: 75g</div>
                        <div className="text-[9px] text-gray-500 mb-2">Owned: {inventory.doubleXp}</div>
                        <button onClick={() => buyItem('doubleXp', 75)} className={`mc-btn ${gold >= 75 ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 opacity-50'} text-xs px-6 py-2`}>BUY</button>
                    </div>

                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 blocky-border p-6 flex flex-col items-center card-hover">
                        <div className="text-5xl mb-2 bounce">🛡️</div>
                        <h3 className="text-gray-300 text-sm mb-1">Steel Shield</h3>
                        <p className="text-[10px] text-gray-400 text-center h-8">Absorbs the next monster attack completely. Press &apos;3&apos; to use.</p>
                        <div className="text-xs text-yellow-400 my-2">Cost: 60g</div>
                        <div className="text-[9px] text-gray-500 mb-2">Owned: {inventory.shields}</div>
                        <button onClick={() => buyItem('shields', 60)} className={`mc-btn ${gold >= 60 ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 opacity-50'} text-xs px-6 py-2`}>BUY</button>
                    </div>

                </div>
            </div>
        );
    }
    if (mode === 'singleplayer' && screen === 'levelcomplete') {
        const m = getMonsterForLevel(currentLevel);
        const isBoss = currentLevel % 10 === 0;
        const hasNext = currentLevel < TOTAL_LEVELS;
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-kingdom z-[100] px-4">
                {/* Gold particle overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 8 }, (_, i) => (
                        <span key={i} className="particle" style={{
                            left: `${10 + i * 12}%`,
                            '--duration': `${8 + i * 2}s`,
                            '--delay': `${i * 0.3}s`,
                            fontSize: '1.5rem'
                        } as React.CSSProperties}>
                            {['✨', '🪙', '⭐', '💫'][i % 4]}
                        </span>
                    ))}
                </div>

                <div className={`victory-burst text-4xl mb-3 ${isBoss ? 'text-6xl' : ''}`}>
                    {isBoss ? '👑' : '⭐'}
                </div>
                <div className="victory-burst text-2xl md:text-3xl text-gold mb-3 text-glow-gold">
                    {isBoss ? 'BOSS DEFEATED!' : `LEVEL ${currentLevel} COMPLETE!`}
                </div>
                <div className="fade-in-up text-xs text-gray-300 mb-1" style={{ '--delay': '0.4s' } as React.CSSProperties}>
                    Defeated {m.name} {m.emoji}
                </div>
                <div className="fade-in-up text-[10px] mb-6 flex gap-4" style={{ '--delay': '0.6s' } as React.CSSProperties}>
                    <span className="text-yellow-400">+{m.reward.gold} 🪙</span>
                    <span className="text-[#39FF14]">+{m.reward.xp} XP</span>
                </div>

                {hasNext && (
                    <div className="fade-in-up text-[10px] text-emerald mb-6" style={{ '--delay': '0.8s', textShadow: '0 0 10px rgba(80,250,123,0.5)' } as React.CSSProperties}>
                        🔓 Level {currentLevel + 1} Unlocked!
                    </div>
                )}

                <div className="fade-in-up flex gap-3" style={{ '--delay': '1s' } as React.CSSProperties}>
                    <button onClick={() => setScreen('levelselect')} className="mc-btn blocky-border bg-gradient-to-b from-gray-600 to-gray-800 text-white px-6 py-3 text-[10px]">
                        📋 LEVEL MAP
                    </button>
                    {hasNext && (
                        <button onClick={() => startFight(currentLevel + 1)} className="mc-btn blocky-border bg-gradient-to-b from-green-500 to-green-700 text-white px-6 py-3 text-[10px] glow-pulse shimmer">
                            NEXT LEVEL →
                        </button>
                    )}
                    {!hasNext && (
                        <div className="text-sm text-gold text-glow-gold victory-burst">
                            🏆 ALL LEVELS COMPLETE!
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const getBgForMonster = (m: MonsterInfo | null) => {
        if (!m) return 'url("/bg_classy.png")';
        const name = m.name.toUpperCase();
        if (['ZOMBIE', 'SKELETON', 'WITHER', 'SLABYRINTH', 'PHANTOM'].some(x => name.includes(x))) return `url('/bg_graveyard.png')`;
        if (['SPIDER', 'CREEPER', 'WITCH', 'GOBLIN', 'WARDEN'].some(x => name.includes(x))) return `url('/bg_forest.png')`;
        if (['BLAZE', 'ENDER DRAGON', 'DRAGON', 'MAGMA'].some(x => name.includes(x))) return `url('/bg_lava.png')`;
        if (['KING', 'QUEEN', 'ROYAL', 'BOSS'].some(x => name.includes(x))) return `url('/bg_throne.png')`;
        return `url('/bg_forest.png')`; // fallback
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-cover bg-center overflow-hidden z-20 transition-all duration-1000" 
             style={{ backgroundImage: screen === 'playing' ? getBgForMonster(monster) : 'url("/bg_classy.png")' }}
             onClick={ensureAudio}>
            {/* ═══ DEATH SCREEN ═══ */}
            {screen === 'dead' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center"
                    style={{
                        background: `radial-gradient(ellipse at center, rgba(139,0,0,${0.8 * deathOpacity}) 0%, rgba(20,0,0,${0.95 * deathOpacity}) 100%)`,
                        transition: 'all 1.5s ease-in',
                        opacity: deathOpacity
                    }}>
                    <div className="text-4xl md:text-6xl text-red-500 mb-6 death-text-glow"
                         style={{ textShadow: '0 0 20px #f00,0 0 40px #f00,0 0 80px #900', animation: 'death-appear 1s ease-out' }}>
                        YOU DIED!
                    </div>
                    <div className="fade-in-up bg-black/50 backdrop-blur-sm p-4 blocky-border-inner mb-6 flex flex-col items-center gap-1"
                         style={{ '--delay': '0.5s' } as React.CSSProperties}>
                        <div className="text-xs text-gray-300">⚔️ Level {currentLevel}</div>
                        <div className="text-[10px] text-gray-400">🗡️ {monstersKilled} Monsters Slain</div>
                        <div className="text-[10px] text-yellow-400">🪙 {gold} Gold · LVL {playerLvl}</div>
                    </div>
                    <div className="fade-in-up flex flex-col gap-3 items-center" style={{ '--delay': '0.8s' } as React.CSSProperties}>
                        <button onClick={() => { setScreen(mode === 'singleplayer' ? 'levelselect' : 'waiting'); setPlayerHp(playerMaxHp); }}
                            className="mc-btn blocky-border bg-gradient-to-b from-gray-600 to-gray-800 text-white px-8 py-4 text-sm">
                            {mode === 'singleplayer' ? '📋 LEVEL MAP' : '🚪 RETURN'}
                        </button>
                        {mode === 'singleplayer' && (
                            <button onClick={() => startFight(currentLevel)}
                                className="mc-btn blocky-border bg-gradient-to-b from-red-700 to-red-900 text-white px-8 py-3 text-xs glow-pulse">
                                🔄 RETRY LEVEL {currentLevel}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ VICTORY ═══ */}
            {screen === 'victory' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-kingdom">
                    <div className="victory-burst text-4xl md:text-6xl text-gold mb-6 text-glow-gold">
                        ⚔️ VICTORY! ⚔️
                    </div>
                    <div className="fade-in-up text-lg text-white mb-8" style={{ '--delay': '0.4s' } as React.CSSProperties}>
                        All monsters vanquished!
                    </div>
                    <button onClick={() => router.push('/')}
                            className="fade-in-up mc-btn blocky-border bg-gradient-to-b from-[#55AA55] to-[#3E8E3E] text-white px-8 py-4 text-sm shimmer"
                            style={{ '--delay': '0.7s' } as React.CSSProperties}>
                        🏰 RETURN TO KINGDOM
                    </button>
                </div>
            )}

            {/* ═══ LEVEL UP FLASH ═══ */}
            {levelUpFlash && (
                <div className="absolute inset-0 z-[90] flex items-center justify-center pointer-events-none"
                    style={{ background: 'radial-gradient(circle,rgba(255,215,0,0.4) 0%,transparent 70%)', animation: 'levelup-flash 1.5s ease-out forwards' }}>
                    <div className="text-3xl text-yellow-300 victory-burst" style={{ textShadow: '0 0 20px #ffd700' }}>
                        ⬆️ LEVEL UP! LVL {playerLvl} ⬆️
                    </div>
                </div>
            )}

            {/* Multiplayer sidebar */}
            {mode === 'random' && (
                <div className="absolute top-20 left-4 w-64 bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-sm p-3 flex flex-col gap-2 z-40 blocky-border slide-in-left">
                    <h3 className="text-[10px] text-gold text-glow-gold">🌐 LOBBY</h3>
                    <div className="text-[8px] text-gray-300 flex flex-col gap-1">
                        {players.map(p => <div key={p.id} className="flex items-center gap-1">👤 {p.name}</div>)}
                    </div>
                    <button className="mc-btn bg-blue-600 text-white text-[8px] py-2 mt-2" onClick={() => alert("WebRTC VC Coming Soon!")}>🎤 VOICE CHAT</button>
                    <div className="border-t border-gray-700 mt-2 flex flex-col h-40">
                        <div className="text-[8px] flex-1 overflow-y-auto flex flex-col gap-1 mt-2">
                            {chatHistory.map((c, i) => (<div key={i}><span className="text-ice">[{c.sender}]</span> {c.text}</div>))}
                        </div>
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={sendChat}
                            className="bg-black/80 text-[8px] p-2 text-white blocky-border-inner transition-all duration-300" placeholder="Chat..." />
                    </div>
                </div>
            )}

            {/* SP sidebar */}
            {mode === 'singleplayer' && screen === 'playing' && (
                <div className="absolute top-20 left-4 w-56 bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-sm p-4 flex flex-col gap-3 z-40 blocky-border slide-in-left">
                    <h3 className="text-[10px] text-gold text-glow-gold flex justify-between">
                        <span>⚔️ LVL {currentLevel}{currentLevel % 10 === 0 ? ' 👑' : ''}</span>
                        <span>WAVE {currentWave}/{maxWaves}</span>
                    </h3>
                    <div className="text-[8px] text-gray-300 space-y-1">
                        <div>👤 {username}</div>
                        <div className="text-[#39FF14]">⚡ {wpm} WPM</div>
                        <div>🗡️ Slain: {monstersKilled}</div>
                    </div>
                    <div className="border-t border-gray-700 pt-2">
                        <div className="text-[8px] text-gray-400">XP: {xp}/{xpToNext}</div>
                        <div className="w-full h-2.5 bg-black blocky-border-inner mt-1 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#39FF14] to-[#50FA7B] transition-all duration-500 ease-out"
                                 style={{ width: `${Math.min(100, (xp / xpToNext) * 100)}%`, boxShadow: '0 0 8px rgba(57,255,20,0.4)' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={`h-16 bg-gradient-to-r from-[#6B3A1B] to-[#8B5A2B] flex items-center justify-between px-4 ${sidebarPadding} shrink-0 border-b-4 border-black z-20 shadow-lg`}>
                <div className="flex items-center gap-4">
                    <div className="text-xs text-white font-bold" style={{ textShadow: '0 0 8px rgba(255,255,255,0.3)' }}>LVL {playerLvl}</div>
                    <div className={`text-[10px] ${playerHp / playerMaxHp > 0.5 ? 'text-green-400' : playerHp / playerMaxHp > 0.25 ? 'text-yellow-400' : 'text-red-400'}`}>
                        ❤️ {Math.max(0, playerHp)}/{playerMaxHp}
                    </div>
                    <div className="text-[10px] text-yellow-400">🪙 {gold}</div>
                    <div className="text-[10px] text-[#39FF14]">✨ {xp}</div>
                    {combo > 1 && (
                        <div className={`text-sm text-[#FF00FF] font-bold ml-4 ${combo >= 5 ? 'combo-fire' : 'bounce'}`}>
                            {combo >= 10 ? '🔥🔥' : combo >= 5 ? '🔥' : '⚡'} COMBO x{combo}!
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {mode === 'random' && screen === 'waiting' && (
                        <button onClick={() => { ensureAudio(); socket?.emit('start_game', "random_global"); }}
                                className="mc-btn bg-gradient-to-b from-green-500 to-green-700 text-xs p-2 glow-pulse">⚔️ START RAID</button>
                    )}
                    {mode === 'singleplayer' && screen === 'playing' && (
                        <button onClick={() => { if (attackTimerRef.current) clearTimeout(attackTimerRef.current); setScreen('levelselect'); setPlayerHp(playerMaxHp); }}
                            className="mc-btn bg-yellow-600 text-xs p-2">📋 MAP</button>
                    )}
                    <button onClick={() => setSettingsOpen(true)} className="mc-btn bg-gray-700 text-xs p-2">⚙️</button>
                    <button onClick={() => router.push('/')} className="mc-btn bg-red-700 text-xs p-2">🚪 LEAVE</button>
                </div>
            </header>

            {/* Combat Area */}
            <div className={`flex-1 flex flex-col items-center justify-center relative ${sidebarPadding} ${shake ? 'animate-shake' : ''}`}
                 style={shake ? { background: 'radial-gradient(circle, rgba(139,0,0,0.3) 0%, transparent 70%)' } : {}}>
                {/* Remove the green grass block, use black gradient for ground anchoring */}
                <div className="absolute bottom-0 w-full h-1/4 bg-gradient-to-t from-black/80 to-transparent z-0 pointer-events-none"></div>

                {monster && (
                    <BabylonArena 
                        enemyName={monster.name} 
                        isAttacking={isPlayerAttacking} 
                        isHit={flash} 
                        character={character}
                        playerAttackKey={playerAttackKey}
                        monsterHitKey={monsterHitKey}
                        attackKey={attackKey}
                        attackDuration={attackDuration}
                    />
                )}

                {screen === 'waiting' && !monster && mode === 'random' && (
                    <div className="flex flex-col items-center text-center scale-in z-10">
                        <div className="text-5xl mb-4 bounce">🛡️</div>
                        <div className="text-sm text-[#8B5A2B] mb-2 font-bold">MULTIPLAYER RAID</div>
                        <div className="text-[10px] text-gray-600">Press START RAID to begin!</div>
                    </div>
                )}

                {monster && (
                    <div className="flex flex-col items-center w-full z-10 px-4 md:px-12 xl:px-32 h-full justify-center mt-12">
                        {/* Status/Health Bars */}
                        <div className="flex flex-wrap justify-between w-full max-w-4xl mb-4 px-4 gap-4">
                           {/* Hero Stats */}
                           <div className="flex flex-col items-start drop-shadow-md">
                               <div className="text-lg font-bold text-white mb-2" style={{ textShadow: '2px 2px 0 #000' }}>{username}</div>
                               <div className="w-48 h-5 bg-black blocky-border-inner relative shadow-lg">
                                   <div className="h-full bg-green-500 transition-all ease-out" style={{ width: `${Math.max(0, (playerHp/playerMaxHp)*100)}%`}}></div>
                               </div>
                           </div>
                           {/* Monster Stats */}
                           <div className="flex flex-col items-end drop-shadow-md">
                               <div className="text-lg font-bold text-white mb-2" style={{ textShadow: '2px 2px 0 #000' }}>{monster.name} {monster.isBoss ? '👑' : ''}</div>
                               {/* Attack Charge Indicator */}
                               <div className="w-48 h-1.5 bg-black/40 blocky-border-inner mb-1 overflow-hidden">
                                   <div key={attackKey} className="h-full attack-charge-bar" style={{ animationDuration: `${attackDuration}ms` }}></div>
                               </div>
                               <div className="w-48 h-5 bg-black blocky-border-inner relative shadow-lg">
                                   <div
                                       className={`h-full ${getHpBarClass(monster.hp ?? monster.maxHp, monster.maxHp)} transition-all ease-out`}
                                       style={{ width: `${Math.max(0, ((monster.hp ?? monster.maxHp) / monster.maxHp) * 100)}%` }}
                                   ></div>
                               </div>
                           </div>
                        </div>

                        {/* Sprites Spacer (To maintain formatting) */}
                        <div className="flex justify-between items-end w-full max-w-3xl mt-4 mb-8 px-4 h-48 md:h-64 pointer-events-none border border-transparent">
                            {/* The 3D Characters exist via Babylon in the background! */}
                        </div>

                        {/* Typing Interface */}
                        <div className="mt-auto mb-12 text-2xl tracking-widest bg-black/90 px-8 py-4 blocky-border-inner drop-shadow-lg scale-in"
                             style={{ boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
                            {currentWord?.text.split('').map((char, i) => (
                                <span key={i} className={`transition-colors duration-100 ${
                                    i < typedVal.length
                                        ? (typedVal[i] === char ? 'text-[#39FF14]' : 'text-red-500')
                                        : 'text-white'
                                }`} style={i < typedVal.length && typedVal[i] === char ? { textShadow: '0 0 10px rgba(57,255,20,0.8)' } : {}}>
                                    {char}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {!monster && screen === 'playing' && (
                    <div className="text-lg text-yellow-400 bounce text-glow-gold">Next monster incoming...</div>
                )}
            </div>

            {/* Input and Item Tracking */}
            <div className={`h-24 bg-gradient-to-r from-gray-600 to-gray-500 flex items-center justify-center relative ${sidebarPadding} shrink-0 border-t-4 border-gray-400 pb-4`}>
                {/* Active Items UI */}
                {screen === 'playing' && mode === 'singleplayer' && (
                    <div className="absolute top-2 left-[50%] -translate-x-1/2 flex gap-4 text-[9px] text-gray-300">
                        <span className={inventory.potions > 0 ? 'text-white' : 'opacity-50'}>[1] 🧪 {inventory.potions}</span>
                        <span className={inventory.freezes > 0 ? (isFrozenRef.current ? 'text-blue-400 animate-pulse' : 'text-white') : 'opacity-50'}>[2] ⌛ {inventory.freezes}</span>
                        <span className={inventory.shields > 0 ? (hasShieldRef.current ? 'text-blue-400' : 'text-white') : 'opacity-50'}>[3] 🛡️ {inventory.shields}</span>
                        {doubleXpRef.current && <span className="text-emerald animate-pulse">📜 2x XP ACTIVE</span>}
                    </div>
                )}
                <input ref={inputRef} type="text" value={typedVal} onChange={handleType} onKeyDown={(e) => {
                    if (screen === 'playing' && mode === 'singleplayer') {
                        if (e.key === '1' && inventory.potions > 0) {
                            e.preventDefault();
                            setInventory(inv => ({ ...inv, potions: inv.potions - 1 }));
                            setPlayerHp(prev => Math.min(playerMaxHp, prev + 50));
                            playSound(audioCtxRef.current, sfxVolume, 'levelup');
                            setFlash(true); setTimeout(() => setFlash(false), 200);
                        } else if (e.key === '2' && inventory.freezes > 0 && !isFrozenRef.current) {
                            e.preventDefault();
                            setInventory(inv => ({ ...inv, freezes: inv.freezes - 1 }));
                            isFrozenRef.current = true;
                            setTimeout(() => { isFrozenRef.current = false; }, 5000);
                        } else if (e.key === '3' && inventory.shields > 0 && !hasShieldRef.current) {
                            e.preventDefault();
                            setInventory(inv => ({ ...inv, shields: inv.shields - 1 }));
                            hasShieldRef.current = true;
                        }
                    }
                }}
                    disabled={screen !== 'playing' || !monster}
                    className="w-full max-w-xl h-16 mt-4 bg-black/90 text-white text-2xl font-pixel p-4 border-4 border-gray-500 uppercase placeholder-gray-600 text-center disabled:opacity-40 transition-all duration-300 focus:outline-none focus:border-yellow-500 focus:shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                    placeholder={screen === 'playing' ? "TYPE TO ATTACK..." : "WAITING..."} autoFocus />
            </div>
        </div>
    );
}
