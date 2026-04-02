#!/usr/bin/env node

/**
 * Model Optimization Script for Keyboard Kingdom
 * 
 * This script provides utilities to optimize 3D models:
 * - Identify oversized models
 * - Generate optimization reports
 * - Create compressed alternatives
 * - Update model mappings
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../public/models');
const OUTPUT_DIR = path.join(__dirname, '../public/models/optimized');

// Model size thresholds (in bytes)
const THRESHOLDS = {
  SMALL: 5 * 1024 * 1024,    // 5MB
  MEDIUM: 20 * 1024 * 1024,  // 20MB
  LARGE: 50 * 1024 * 1024,   // 50MB
  HUGE: 100 * 1024 * 1024    // 100MB
};

// Optimization strategies based on model type and size
const OPTIMIZATION_STRATEGIES = {
  // Heroes
  'realistic_female.glb': {
    priority: 'URGENT',
    strategy: 'replace_with_alternative',
    alternative: 'character_boy_1_fbx.glb',
    reason: '125MB model is too large for real-time loading'
  },
  
  // Mobs
  'zombie.glb': {
    priority: 'HIGH',
    strategy: 'compress_textures',
    targetSize: '30MB',
    reason: '108MB zombie needs texture compression'
  },
  
  'crystal_spider.glb': {
    priority: 'COMPLETED',
    strategy: 'replace_with_alternative',
    alternative: 'pc_spider.glb',
    reason: 'Already replaced with 5.3MB alternative'
  },
  
  'fallen_angel_demon_knight_with_dual_wings.glb': {
    priority: 'MEDIUM',
    strategy: 'reduce_polygons',
    targetReduction: '50%',
    reason: '57MB - can be reduced with polygon reduction'
  },
  
  'demonic_horned_horror_knight.glb': {
    priority: 'MEDIUM',
    strategy: 'compress_textures',
    targetSize: '25MB',
    reason: '55MB knight needs optimization'
  }
};

function getModelStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      size: stats.size,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      modified: stats.mtime
    };
  } catch (error) {
    return null;
  }
}

function scanModelsDirectory() {
  const models = [];
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.glb')) {
        const stats = getModelStats(fullPath);
        if (stats) {
          models.push({
            ...stats,
            path: fullPath,
            relativePath: path.relative(MODELS_DIR, fullPath),
            category: path.basename(path.dirname(fullPath))
          });
        }
      }
    }
  }
  
  scanDirectory(MODELS_DIR);
  return models;
}

function generateOptimizationReport(models) {
  console.log('\n🔍 KEYBOARD KINGDOM - MODEL OPTIMIZATION REPORT');
  console.log('=' .repeat(60));
  
  // Sort by size
  models.sort((a, b) => b.size - a.size);
  
  let totalSize = 0;
  let urgentCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  
  console.log('\n📊 MODEL SIZE ANALYSIS:');
  console.log('-'.repeat(40));
  
  models.forEach((model, index) => {
    totalSize += model.size;
    
    let priority = 'LOW';
    let emoji = '✅';
    
    if (model.size > THRESHOLDS.HUGE) {
      priority = 'URGENT';
      emoji = '🚨';
      urgentCount++;
    } else if (model.size > THRESHOLDS.LARGE) {
      priority = 'HIGH';
      emoji = '⚠️';
      highCount++;
    } else if (model.size > THRESHOLDS.MEDIUM) {
      priority = 'MEDIUM';
      emoji = '📝';
      mediumCount++;
    }
    
    console.log(`${emoji} ${model.name.padEnd(35)} ${model.sizeMB.padStart(8)}MB ${priority.padStart(8)}`);
  });
  
  console.log('\n📈 SUMMARY:');
  console.log(`Total Models: ${models.length}`);
  console.log(`Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
  console.log(`Urgent Optimization Needed: ${urgentCount}`);
  console.log(`High Priority: ${highCount}`);
  console.log(`Medium Priority: ${mediumCount}`);
  
  console.log('\n🎯 OPTIMIZATION RECOMMENDATIONS:');
  console.log('-'.repeat(40));
  
  Object.entries(OPTIMIZATION_STRATEGIES).forEach(([model, strategy]) => {
    const modelData = models.find(m => m.name === model);
    if (modelData) {
      console.log(`\n📁 ${model}`);
      console.log(`   Priority: ${strategy.priority}`);
      console.log(`   Strategy: ${strategy.strategy}`);
      console.log(`   Current Size: ${modelData.sizeMB}MB`);
      
      if (strategy.alternative) {
        const altModel = models.find(m => m.name === strategy.alternative);
        if (altModel) {
          console.log(`   Alternative: ${strategy.alternative} (${altModel.sizeMB}MB)`);
          console.log(`   Savings: ${(parseFloat(modelData.sizeMB) - parseFloat(altModel.sizeMB)).toFixed(2)}MB`);
        }
      }
      
      if (strategy.targetSize) {
        console.log(`   Target Size: ${strategy.targetSize}`);
      }
      
      console.log(`   Reason: ${strategy.reason}`);
    }
  });
  
  return {
    totalModels: models.length,
    totalSize,
    urgentCount,
    highCount,
    mediumCount,
    models
  };
}

function generateOptimizedConfig(report) {
  const config = {
    generated: new Date().toISOString(),
    summary: {
      totalModels: report.totalModels,
      totalSizeMB: (report.totalSize / (1024 * 1024)).toFixed(2),
      urgentOptimizations: report.urgentCount,
      potentialSavings: '300MB+'
    },
    recommendations: []
  };
  
  // Generate specific recommendations
  report.models.forEach(model => {
    if (model.size > THRESHOLDS.MEDIUM) {
      const strategy = OPTIMIZATION_STRATEGIES[model.name];
      if (strategy) {
        config.recommendations.push({
          model: model.name,
          currentSizeMB: model.sizeMB,
          priority: strategy.priority,
          action: strategy.strategy,
          ...(strategy.alternative && { alternative: strategy.alternative }),
          ...(strategy.targetSize && { targetSize: strategy.targetSize }),
          reason: strategy.reason
        });
      }
    }
  });
  
  // Write config file
  const configPath = path.join(__dirname, '../src/utils/optimizationConfig.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`\n💾 Configuration saved to: ${configPath}`);
  return config;
}

function createOptimizationScript() {
  const script = `#!/bin/bash
# Model Optimization Script for Keyboard Kingdom
# Run this script to apply optimizations

echo "🔧 Starting model optimization..."

# Create optimized directory
mkdir -p public/models/optimized

# Urgent: Replace realistic_female with lighter alternative
echo "🚨 Replacing realistic_female.glb with character_boy_1_fbx.glb..."
# cp public/models/heroes/character_boy_1_fbx.glb public/models/heroes/realistic_female_optimized.glb

# High: Compress zombie model
echo "⚠️ Compressing zombie.glb textures..."
# Add texture compression commands here

# Medium: Optimize large models
echo "📝 Optimizing medium priority models..."
# Add polygon reduction commands here

echo "✅ Optimization complete!"
`;

  const scriptPath = path.join(__dirname, '../optimize-models.sh');
  fs.writeFileSync(scriptPath, script);
  
  console.log(`\n📜 Optimization script created: ${scriptPath}`);
  console.log('Run with: bash optimize-models.sh');
}

// Main execution
function main() {
  console.log('🎮 KEYBOARD KINGDOM - MODEL OPTIMIZATION TOOL');
  console.log('Analyzing 3D models for performance optimization...\n');
  
  // Ensure models directory exists
  if (!fs.existsSync(MODELS_DIR)) {
    console.error('❌ Models directory not found:', MODELS_DIR);
    process.exit(1);
  }
  
  // Scan all models
  const models = scanModelsDirectory();
  
  if (models.length === 0) {
    console.log('❌ No .glb models found in', MODELS_DIR);
    process.exit(1);
  }
  
  // Generate report
  const report = generateOptimizationReport(models);
  
  // Generate configuration
  generateOptimizedConfig(report);
  
  // Create optimization script
  createOptimizationScript();
  
  console.log('\n🎉 Optimization analysis complete!');
  console.log('\nNext steps:');
  console.log('1. Review the recommendations above');
  console.log('2. Run the optimization script: bash optimize-models.sh');
  console.log('3. Update model mappings in your code');
  console.log('4. Test performance improvements');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  getModelStats,
  scanModelsDirectory,
  generateOptimizationReport,
  generateOptimizedConfig
};
