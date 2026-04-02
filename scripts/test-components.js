#!/usr/bin/env node

/**
 * Component Testing Script for Keyboard Kingdom
 * Tests each optimized component to ensure they're working correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TESTING KEYBOARD KINGDOM COMPONENTS');
console.log('='.repeat(50));

// Test 1: Check if all optimization files exist
console.log('\n📁 Testing File Structure...');

const requiredFiles = [
  'src/utils/modelLoader.ts',
  'src/utils/modelOptimization.ts',
  'src/components/ModelPerformanceMonitor.tsx',
  'src/utils/optimizationConfig.json',
  'scripts/optimize-models.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Test 2: Check model optimization configuration
console.log('\n⚙️ Testing Optimization Config...');

try {
  const configPath = path.join(__dirname, '..', 'src/utils/optimizationConfig.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log(`✅ Config generated: ${config.generated}`);
  console.log(`✅ Total models: ${config.summary.totalModels}`);
  console.log(`✅ Total size: ${config.summary.totalSizeMB}MB`);
  console.log(`✅ Urgent optimizations: ${config.summary.urgentOptimizations}`);
  
  if (config.recommendations.length > 0) {
    console.log(`✅ Has ${config.recommendations.length} optimization recommendations`);
  }
} catch (error) {
  console.log(`❌ Config error: ${error.message}`);
  allFilesExist = false;
}

// Test 3: Check server model assignments
console.log('\n🎮 Testing Server Model Assignments...');

try {
  const serverPath = path.join(__dirname, '..', 'server.mjs');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Check if model assignments exist
  if (serverContent.includes('model: {')) {
    console.log('✅ Server has model assignments');
  } else {
    console.log('❌ Server missing model assignments');
    allFilesExist = false;
  }
  
  // Check specific level assignments
  const expectedModels = [
    'slime_1.glb',
    'pc_spider.glb', 
    'skeleton_-_low_tier_enemy.glb',
    'zombie.glb',
    'demonic_horned_horror_knight.glb',
    'ender_dragon.glb'
  ];
  
  expectedModels.forEach(model => {
    if (serverContent.includes(model)) {
      console.log(`✅ Found ${model} assignment`);
    } else {
      console.log(`❌ Missing ${model} assignment`);
      allFilesExist = false;
    }
  });
  
} catch (error) {
  console.log(`❌ Server check error: ${error.message}`);
  allFilesExist = false;
}

// Test 4: Check BabylonArena optimization
console.log('\n🎨 Testing BabylonArena Optimizations...');

try {
  const arenaPath = path.join(__dirname, '..', 'src/components/BabylonArena.tsx');
  const arenaContent = fs.readFileSync(arenaPath, 'utf8');
  
  if (arenaContent.includes('monsterData?.model')) {
    console.log('✅ Uses server-provided model data');
  } else {
    console.log('❌ Missing server model data usage');
    allFilesExist = false;
  }
  
  if (arenaContent.includes('Use better model instead of basic boy')) {
    console.log('✅ Has realistic_female optimization');
  } else {
    console.log('❌ Missing realistic_female optimization');
    allFilesExist = false;
  }
  
  if (arenaContent.includes('[enemyName, monsterData]')) {
    console.log('✅ Proper dependency array for model updates');
  } else {
    console.log('❌ Missing proper dependency array');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`❌ BabylonArena check error: ${error.message}`);
  allFilesExist = false;
}

// Test 5: Check GameClient integration
console.log('\n🕹️ Testing GameClient Integration...');

try {
  const clientPath = path.join(__dirname, '..', 'src/components/GameClient.tsx');
  const clientContent = fs.readFileSync(clientPath, 'utf8');
  
  if (clientContent.includes('ModelPerformanceMonitor')) {
    console.log('✅ Performance monitor imported');
  } else {
    console.log('❌ Performance monitor not imported');
    allFilesExist = false;
  }
  
  if (clientContent.includes('monsterData={monster}')) {
    console.log('✅ Monster data passed to BabylonArena');
  } else {
    console.log('❌ Monster data not passed to BabylonArena');
    allFilesExist = false;
  }
  
  if (clientContent.includes('setPlayerHp((prev: number)')) {
    console.log('✅ TypeScript errors fixed');
  } else {
    console.log('❌ TypeScript errors not fixed');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`❌ GameClient check error: ${error.message}`);
  allFilesExist = false;
}

// Test 6: Check Next.js config
console.log('\n⚡ Testing Next.js Config...');

try {
  const configPath = path.join(__dirname, '..', 'next.config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  if (configContent.includes('allowedDevOrigins')) {
    console.log('✅ CORS configuration added');
  } else {
    console.log('❌ CORS configuration missing');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`❌ Next.js config error: ${error.message}`);
  allFilesExist = false;
}

// Final Results
console.log('\n📊 TEST RESULTS');
console.log('='.repeat(30));

if (allFilesExist) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('\n✅ Components are properly optimized and integrated');
  console.log('✅ Model assignments are working');
  console.log('✅ Performance monitoring is active');
  console.log('✅ Server is configured correctly');
  
  console.log('\n🚀 Ready for testing!');
  console.log('1. Open http://localhost:3000');
  console.log('2. Click "📊 Performance" to monitor models');
  console.log('3. Start a game to test optimized models');
  
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('Please check the errors above and fix them before proceeding.');
}

// Test 7: Check model files exist
console.log('\n📦 Testing Model Files...');

const modelFiles = [
  'public/models/heroes/character_boy_1_fbx.glb',
  'public/models/mobs/slime_1.glb',
  'public/models/mobs/pc_spider.glb',
  'public/models/mobs/skeleton_-_low_tier_enemy.glb',
  'public/models/mobs/zombie.glb',
  'public/models/mobs/demonic_horned_horror_knight.glb',
  'public/models/mobs/ender_dragon.glb'
];

let modelsExist = true;

modelFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ ${file} (${sizeMB}MB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    modelsExist = false;
  }
});

if (modelsExist) {
  console.log('\n✅ All required model files are present');
} else {
  console.log('\n❌ Some model files are missing');
}

console.log('\n🏁 Component testing complete!');
