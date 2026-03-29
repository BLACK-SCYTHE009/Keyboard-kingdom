// ─── Dynamic Word Generation System ───
// Words scale in difficulty (length & complexity) based on the current game level.
// Now with mixed-tier selection for micro-variation within fights.

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
 * Pick a random word with mixed-tier selection for micro-variation.
 * 70% current tier, 20% one tier below, 10% one tier above.
 * Boss levels shift the distribution one tier higher.
 */
export function pickWordForLevel(level: number): string {
    const isBoss = level % 10 === 0;
    let baseTier = getTierForLevel(level);

    if (isBoss && baseTier < TIERS.length - 1) baseTier++;

    // Mixed-tier roll
    const roll = Math.random();
    let tierIdx: number;
    if (roll < 0.10 && baseTier < TIERS.length - 1) {
        tierIdx = baseTier + 1; // 10%: harder word
    } else if (roll < 0.30 && baseTier > 0) {
        tierIdx = baseTier - 1; // 20%: easier word
    } else {
        tierIdx = baseTier; // 70%: current tier
    }

    const pool = TIERS[tierIdx];
    return pool[Math.floor(Math.random() * pool.length)].toUpperCase();
}
