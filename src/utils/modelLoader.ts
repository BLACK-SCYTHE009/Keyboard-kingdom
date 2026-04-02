// Model loading optimization utilities
import { SceneLoader, AbstractMesh, Scene } from "@babylonjs/core";

interface LoadedModel {
  mesh: AbstractMesh | null;
  loadTime: number;
  lastUsed: number;
  refCount: number;
}

class ModelCache {
  private cache = new Map<string, LoadedModel>();
  private maxCacheSize = 50; // Maximum models to keep in memory
  private maxAge = 300000; // 5 minutes before considering for cleanup

  async loadModel(modelPath: string, modelFile: string, scene: Scene): Promise<LoadedModel> {
    const cacheKey = `${modelPath}/${modelFile}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      cached.lastUsed = Date.now();
      cached.refCount++;
      
      // Clone mesh for this instance
      const originalMesh = cached.mesh;
      if (!originalMesh) {
        throw new Error('Original mesh is null');
      }
      const clonedMesh = originalMesh.clone(`${modelFile}_instance_${Date.now()}`, null);
      if (!clonedMesh) {
        throw new Error('Failed to clone mesh');
      }
      return {
        mesh: clonedMesh,
        loadTime: 0,
        lastUsed: Date.now(),
        refCount: 1
      };
    }

    // Load from disk
    const startTime = performance.now();
    const result = await SceneLoader.ImportMeshAsync("", modelPath, modelFile, scene);
    const loadTime = performance.now() - startTime;
    
    const loadedModel: LoadedModel = {
      mesh: result.meshes[0],
      loadTime,
      lastUsed: Date.now(),
      refCount: 1
    };

    // Add to cache
    this.cache.set(cacheKey, loadedModel);
    this.cleanupCache();

    return loadedModel;
  }

  private cleanupCache() {
    if (this.cache.size <= this.maxCacheSize) return;

    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Sort by last used time and reference count
    entries.sort((a, b) => {
      const [, modelA] = a;
      const [, modelB] = b;
      
      // Prioritize cleaning up models with no references and old age
      if (modelA.refCount === 0 && modelB.refCount === 0) {
        return modelA.lastUsed - modelB.lastUsed;
      }
      if (modelA.refCount === 0) return -1;
      if (modelB.refCount === 0) return 1;
      
      return modelA.lastUsed - modelB.lastUsed;
    });

    // Remove oldest unused models
    let removed = 0;
    for (const [key, model] of entries) {
      if (model.refCount === 0 && (now - model.lastUsed) > this.maxAge) {
        if (model.mesh) {
          model.mesh.dispose(false, true);
        }
        this.cache.delete(key);
        removed++;
        
        if (removed >= 10) break; // Remove max 10 models per cleanup
      }
    }
  }

  releaseModel(modelPath: string, modelFile: string) {
    const cacheKey = `${modelPath}/${modelFile}`;
    const model = this.cache.get(cacheKey);
    if (model) {
      model.refCount = Math.max(0, model.refCount - 1);
    }
  }

  getStats() {
    const totalSize = this.cache.size;
    const referencedCount = Array.from(this.cache.values()).filter(m => m.refCount > 0).length;
    const avgLoadTime = Array.from(this.cache.values()).reduce((sum, m) => sum + m.loadTime, 0) / totalSize;

    return {
      totalCached: totalSize,
      referenced: referencedCount,
      avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): string {
    // Rough estimation based on mesh count and complexity
    let totalVertices = 0;
    let totalFaces = 0;
    
    this.cache.forEach(model => {
      if (model.mesh) {
        model.mesh.getChildMeshes().forEach(mesh => {
          if (mesh.getTotalVertices) {
            totalVertices += mesh.getTotalVertices();
          }
        });
      }
    });

    // Rough estimation: 1 vertex ≈ 12 bytes, 1 face ≈ 12 bytes
    const estimatedBytes = (totalVertices * 12) + (totalFaces * 12);
    return (estimatedBytes / (1024 * 1024)).toFixed(2) + 'MB';
  }

  clearCache() {
    this.cache.forEach(model => {
      if (model.refCount === 0 && model.mesh) {
        model.mesh.dispose(false, true);
      }
    });
    this.cache.clear();
  }
}

// Global model cache instance
export const modelCache = new ModelCache();

// Progressive loading utility
export class ProgressiveModelLoader {
  private loadQueue: Array<{
    modelPath: string;
    modelFile: string;
    scene: Scene;
    priority: number;
    resolve: (model: LoadedModel) => void;
    reject: (error: any) => void;
  }> = [];

  private loading = false;
  private maxConcurrentLoads = 2;

  async loadModel(
    modelPath: string, 
    modelFile: string, 
    scene: Scene, 
    priority: number = 0
  ): Promise<LoadedModel> {
    return new Promise((resolve, reject) => {
      this.loadQueue.push({
        modelPath,
        modelFile,
        scene,
        priority,
        resolve,
        reject
      });

      this.loadQueue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.loading || this.loadQueue.length === 0) return;

    this.loading = true;

    const concurrentLoads = Math.min(this.maxConcurrentLoads, this.loadQueue.length);
    const promises = [];

    for (let i = 0; i < concurrentLoads; i++) {
      const task = this.loadQueue.shift();
      if (task) {
        promises.push(this.processLoadTask(task));
      }
    }

    await Promise.allSettled(promises);
    this.loading = false;

    // Continue processing if there are more items
    if (this.loadQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async processLoadTask(task: any) {
    try {
      const model = await modelCache.loadModel(task.modelPath, task.modelFile, task.scene);
      task.resolve(model);
    } catch (error) {
      task.reject(error);
    }
  }
}

export const progressiveLoader = new ProgressiveModelLoader();

// Performance monitoring
export class ModelPerformanceMonitor {
  private loadTimes: Array<{ model: string; time: number; timestamp: number }> = [];
  private maxRecords = 100;

  recordLoad(modelFile: string, loadTime: number) {
    this.loadTimes.push({
      model: modelFile,
      time: loadTime,
      timestamp: Date.now()
    });

    if (this.loadTimes.length > this.maxRecords) {
      this.loadTimes.shift();
    }
  }

  getPerformanceReport() {
    if (this.loadTimes.length === 0) return null;

    const avgLoadTime = this.loadTimes.reduce((sum, record) => sum + record.time, 0) / this.loadTimes.length;
    const slowestModel = this.loadTimes.reduce((max, record) => record.time > max.time ? record : max);
    const fastestModel = this.loadTimes.reduce((min, record) => record.time < min.time ? record : min);

    return {
      totalLoads: this.loadTimes.length,
      avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
      slowestModel: {
        name: slowestModel.model,
        time: slowestModel.time.toFixed(2) + 'ms'
      },
      fastestModel: {
        name: fastestModel.model,
        time: fastestModel.time.toFixed(2) + 'ms'
      },
      recentPerformance: this.getRecentPerformance()
    };
  }

  private getRecentPerformance() {
    const recent = this.loadTimes.slice(-10);
    if (recent.length === 0) return null;

    const avgRecent = recent.reduce((sum, record) => sum + record.time, 0) / recent.length;
    return avgRecent.toFixed(2) + 'ms';
  }
}

export const performanceMonitor = new ModelPerformanceMonitor();
