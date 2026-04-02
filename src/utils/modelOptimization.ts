// Model optimization configuration for Keyboard Kingdom
// This file maps each level to optimized 3D models and tracks optimization status

export interface ModelConfig {
  file: string;
  scale: number;
  tint: { r: number; g: number; b: number };
  intensity: number;
  fileSize: number; // in bytes
  optimized: boolean;
  lodLevels?: number; // Levels of detail supported
}

export interface LevelModelMapping {
  [levelName: string]: ModelConfig;
}

// Current model assignments based on optimization analysis
export const LEVEL_MODEL_MAPPING: LevelModelMapping = {
  // Level 1: Slime - Using lightweight slime model
  "Slime": {
    file: "slime_1.glb",
    scale: 15.0,
    tint: { r: 0.4, g: 1, b: 0.4 },
    intensity: 0.3,
    fileSize: 2837060, // 2.7MB - Good size
    optimized: true,
    lodLevels: 1
  },

  // Level 2: Spider - Using PC spider (much smaller than crystal spider)
  "Spider": {
    file: "pc_spider.glb",
    scale: 0.04,
    tint: { r: 1, g: 0.2, b: 0.2 },
    intensity: 0.3,
    fileSize: 5576476, // 5.3MB - Acceptable
    optimized: true,
    lodLevels: 1
  },

  // Level 3: Skeleton - Using low-tier skeleton enemy
  "Skeleton": {
    file: "skeleton_-_low_tier_enemy.glb",
    scale: 0.04,
    tint: { r: 1, g: 1, b: 1 },
    intensity: 0.3,
    fileSize: 33388076, // 31.8MB - Could be optimized further
    optimized: false,
    lodLevels: 1
  },

  // Level 4: Zombie - Large file but necessary for the visual
  "Zombie": {
    file: "zombie.glb",
    scale: 0.04,
    tint: { r: 0.6, g: 1, b: 0.6 },
    intensity: 0.3,
    fileSize: 113455964, // 108.2MB - LARGE, needs optimization
    optimized: false,
    lodLevels: 1
  },

  // Level 5: Creeper - Using demon knight model
  "Creeper": {
    file: "demonic_horned_horror_knight.glb",
    scale: 0.045,
    tint: { r: 0, g: 1, b: 0 },
    intensity: 0.3,
    fileSize: 58187012, // 55.5MB - Large but detailed
    optimized: false,
    lodLevels: 1
  },

  // Boss: Ender Dragon - Very small and efficient
  "Ender Dragon": {
    file: "ender_dragon.glb",
    scale: 0.15,
    tint: { r: 0.5, g: 0, b: 0.8 },
    intensity: 0.8,
    fileSize: 1429152, // 1.36MB - Excellent size
    optimized: true,
    lodLevels: 1
  }
};

// Hero model configurations
export const HERO_MODEL_MAPPING = {
  "heroA": {
    file: "Xbot.glb",
    path: "https://models.babylonjs.com/",
    scale: 2.5,
    optimized: true
  },
  "heroB": {
    file: "Ybot.glb", 
    path: "https://models.babylonjs.com/",
    scale: 2.5,
    optimized: true
  },
  "stella": {
    file: "stella_girl.glb",
    path: "/models/heroes/",
    scale: 0.8,
    optimized: false, // 20.6MB - could be optimized
    fileSize: 21621464
  },
  "realistic_female": {
    file: "realistic_female.glb",
    path: "/models/heroes/",
    scale: 2.5,
    optimized: false, // 125.9MB - VERY LARGE, needs urgent optimization
    fileSize: 132067592
  },
  "character_boy_1_fbx": {
    file: "character_boy_1_fbx.glb",
    path: "/models/heroes/",
    scale: 2.5,
    optimized: true, // 2.7MB - Good size
    fileSize: 2785396
  },
  "tomb_raider_laracroft": {
    file: "tomb_raider_laracroft.glb",
    path: "/models/heroes/",
    scale: 0.04,
    optimized: false, // 13.2MB - could be optimized
    fileSize: 13808376
  }
};

// Optimization recommendations
export const OPTIMIZATION_RECOMMENDATIONS = {
  urgent: [
    "realistic_female.glb - 125.9MB (consider using character_boy_1_fbx.glb as alternative)",
    "zombie.glb - 108.2MB (needs mesh compression and texture optimization)"
  ],
  high: [
    "crystal_spider.glb - 64MB (replaced with pc_spider.glb 5.3MB)",
    "fallen_angel_demon_knight_with_dual_wings.glb - 57.8MB",
    "demonic_horned_horror_knight.glb - 55.5MB",
    "black_gothic_skeleton_demon_knight.glb - 47.9MB"
  ],
  medium: [
    "skeleton_-_low_tier_enemy.glb - 31.8MB",
    "fantasy_sword.glb - 24.7MB",
    "stella_girl_2.glb - 22.7MB",
    "stella_girl.glb - 20.6MB",
    "slime_2.glb - 19.3MB",
    "tomb_raider_laracroft.glb - 13.2MB"
  ]
};

// Total size calculations
export const SIZE_ANALYSIS = {
  totalModelsSize: "580MB+",
  optimizedModelsSize: "12.5MB",
  potentialSavings: "300MB+",
  largestModels: [
    "realistic_female.glb (125.9MB)",
    "zombie.glb (108.2MB)", 
    "crystal_spider.glb (64MB)",
    "fallen_angel_demon_knight_with_dual_wings.glb (57.8MB)",
    "demonic_horned_horror_knight.glb (55.5MB)"
  ]
};
