export type ElementType = 'FIRE' | 'WATER' | 'NATURE' | 'NORMAL';

export interface WordInfo {
    text: string;
    element: ElementType;
}

const FIRE_WORDS = ["BLAZE", "FLAME", "PYRE", "EMBER", "SCORCH", "MAGMA", "INFERNO", "HELLFIRE", "ASHES"];
const WATER_WORDS = ["STREAM", "OCEAN", "TIDE", "WAVE", "STORM", "RIVER", "DEPTHS", "FROST", "GLACIER"];
const NATURE_WORDS = ["THORN", "VINE", "OAK", "LEAF", "WOOD", "EARTH", "MOSS", "FOREST", "JUNGLE"];

const TIER_1 = [
    "AXE", "BOW", "COW", "DIG", "EGG", "FIG", "GEM", "HIT", "ICE", "JAM",
    "KEY", "LOG", "MAP", "NET", "OAK", "PIG", "RAW", "SKY", "TIN", "WAR",
    "ARM", "BAT", "CUP", "DAM", "ELF", "FAN", "GOD", "HOP", "INK", "JAR",
    "KIT", "LID", "MOB", "NUT", "ORB", "PIT", "RIB", "SUN", "TAR", "URN",
];

const TIER_2 = [
    "FIRE", "DIRT", "CAVE", "GOLD", "IRON", "LAVA", "WOOD", "BONE", "DARK",
    "FEAR", "HAWK", "KING", "LAMP", "MAZE", "OATH", "PIKE", "RUNE", "SAGE",
    "TUSK", "VINE", "WOLF", "YELL", "APEX", "BOLT", "CLAW", "DUSK", "FANG",
    "GATE", "HELM", "JADE", "KNOT", "LION", "MIST", "NEST", "OMEN", "PYRE",
    "RAZE", "SLAY", "TRAP", "WARD", "FURY", "GLOW", "HAZE", "JINX", "LORE",
];

const TIER_3 = [
    "SWORD", "STONE", "TORCH", "ARMOR", "CHEST", "CRAFT", "BLOCK", "APPLE",
    "WATER", "STEAM", "FLINT", "GRAIN", "HEART", "IVORY", "JEWEL", "KNIFE",
    "LANCE", "MANOR", "QUAKE", "REIGN", "SKULL", "TOWER", "VAULT", "WRATH",
    "BLAST", "CLOAK", "DWARF", "FORGE", "GHOST", "HOUND", "MARSH", "NOBLE",
    "OCEAN", "PLUME", "RIDGE", "SHADE", "THORN", "VIGOR", "QUEST", "FLAME",
];

const TIER_4 = [
    "PORTAL", "NETHER", "POTION", "MINING", "BEACON", "PISTON", "SHIELD",
    "GOBLIN", "DRAGON", "HUNTER", "FROZEN", "SHADOW", "BATTLE", "CASTLE",
    "DAGGER", "FOREST", "GAUNTL", "KNIGHT", "MYSTIC", "PLAGUE", "REVOLT",
    "THRONE", "UNDEAD", "WINTER", "ARCHER", "BANDIT", "CLERIC", "SPIRIT",
    "INFERNO", "TEMPEST", "PHANTOM", "WYVERN", "BLIGHT", "CIPHER", "SCROLL",
];

const TIER_5 = [
    "DIAMOND", "FURNACE", "EMERALD", "TRIDENT", "ENCHANT", "ANVILS",
    "OBSIDIAN", "REDSTONE", "PICKAXE", "KINGDOM", "DUNGEON", "BLIZZARD",
    "ALCHEMY", "BASTION", "CRUSHER", "DESTINY", "ELEMENT", "FIREBALL",
    "GRIFFIN", "CRUSADE", "CITADEL", "TORMENT", "THUNDER", "RAMPART",
    "SORCERY", "WARLOCK", "CRYSTAL", "VAMPIRE", "REVENGE", "WARRIOR",
    "COLOSSUS", "DEMONLORD", "OVERLORD", "CONQUEST", "VANGUARD", "IMMORTAL",
    "BERSERKER", "CATACLYSM", "SPELLCAST", "LEVIATHAN", "NIGHTMARE", "GRAVEYARD",
];

const TIERS = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5];

function getTierForLevel(level: number): number {
    return Math.min(Math.floor((level - 1) / 6), TIERS.length - 1);
}

/**
 * Pick a random word metadata with mixed-tier selection.
 * 20% Chance of an Elemental Word.
 */
export function pickWordForLevel(level: number): WordInfo {
    const isBoss = level % 10 === 0;
    let baseTier = getTierForLevel(level);

    if (isBoss && baseTier < TIERS.length - 1) baseTier++;

    // Element Roll (20%)
    if (Math.random() < 0.20) {
        const types: ElementType[] = ['FIRE', 'WATER', 'NATURE'];
        const element = types[Math.floor(Math.random() * types.length)];
        const pool = element === 'FIRE' ? FIRE_WORDS : element === 'WATER' ? WATER_WORDS : NATURE_WORDS;
        return {
            text: pool[Math.floor(Math.random() * pool.length)].toUpperCase(),
            element
        };
    }

    // Mixed-tier roll for Normal words
    const roll = Math.random();
    let tierIdxIdx: number;
    if (roll < 0.10 && baseTier < TIERS.length - 1) {
        tierIdxIdx = baseTier + 1;
    } else if (roll < 0.30 && baseTier > 0) {
        tierIdxIdx = baseTier - 1;
    } else {
        tierIdxIdx = baseTier;
    }

    const pool = TIERS[tierIdxIdx];
    return {
        text: pool[Math.floor(Math.random() * pool.length)].toUpperCase(),
        element: 'NORMAL'
    };
}
