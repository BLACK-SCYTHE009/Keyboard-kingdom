#!/usr/bin/env node

/**
 * Quick Debug Script for Keyboard Kingdom
 * Check what's happening with models and server
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 KEYBOARD KINGDOM DEBUG');
console.log('='.repeat(40));

// Check server configuration
console.log('\n📁 Server Configuration:');
try {
    const serverPath = path.join(__dirname, 'server.mjs');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Extract level data
    const levelMatch = serverContent.match(/const levels = \[([\s\S]*?)\];/s);
    if (levelMatch) {
        const levelData = levelMatch[1];
        console.log('✅ Found levels configuration');
        
        // Count model assignments
        const modelMatches = levelData.match(/model:\s*\{[^}]+\}/g);
        console.log(`📊 Found ${modelMatches ? modelMatches.length : 0} model assignments`);
        
        // Check specific models
        if (levelData.includes('ender_dragon.glb')) {
            console.log('✅ Ender Dragon model assigned');
        }
        if (levelData.includes('warden.glb')) {
            console.log('✅ Warden model assigned');
        }
        if (levelData.includes('wither_storm.glb')) {
            console.log('✅ Wither Storm model assigned');
        }
    } else {
        console.log('❌ Could not parse levels configuration');
    }
} catch (error) {
    console.log('❌ Server file error:', error.message);
}

// Check model files exist
console.log('\n📦 Model Files:');
const modelDir = path.join(__dirname, 'public/models/mobs');
if (fs.existsSync(modelDir)) {
    const models = fs.readdirSync(modelDir).filter(f => f.endsWith('.glb'));
    models.forEach(model => {
        const modelPath = path.join(modelDir, model);
        const stats = fs.statSync(modelPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ ${model} (${sizeMB}MB)`);
    });
} else {
    console.log('❌ Models directory not found');
}

// Check BabylonArena configuration
console.log('\n🎮 BabylonArena Configuration:');
try {
    const arenaPath = path.join(__dirname, 'src/components/BabylonArena.tsx');
    const arenaContent = fs.readFileSync(arenaPath, 'utf8');
    
    if (arenaContent.includes('ender_dragon.glb')) {
        console.log('✅ BabylonArena references ender_dragon.glb');
    }
    if (arenaContent.includes('warden.glb')) {
        console.log('✅ BabylonArena references warden.glb');
    }
    if (arenaContent.includes('wither_storm.glb')) {
        console.log('✅ BabylonArena references wither_storm.glb');
    }
    if (arenaContent.includes('monsterData?.model')) {
        console.log('✅ Uses server-provided model data');
    } else {
        console.log('❌ Missing server model data usage');
    }
} catch (error) {
    console.log('❌ BabylonArena file error:', error.message);
}

console.log('\n🚀 Debug Complete!');
console.log('If models still look "tinny", check:');
console.log('1. Browser console for errors');
console.log('2. Network tab for failed model loads');
console.log('3. Model files are actually loading');
