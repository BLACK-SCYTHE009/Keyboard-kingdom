"use client";

import React, { useEffect, useState } from 'react';
import { modelCache, performanceMonitor } from '@/utils/modelLoader';

interface PerformanceStats {
  totalCached: number;
  referenced: number;
  avgLoadTime: string;
  memoryUsage: string;
}

interface PerformanceReport {
  totalLoads: number;
  avgLoadTime: string;
  slowestModel: { name: string; time: string };
  fastestModel: { name: string; time: string };
  recentPerformance: string | null;
}

export default function ModelPerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update stats every 2 seconds
    const interval = setInterval(() => {
      setStats(modelCache.getStats());
      setReport(performanceMonitor.getPerformanceReport());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded text-xs z-50 hover:bg-purple-700"
      >
        📊 Performance
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs z-50 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-green-400">🎮 Model Performance</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-400 hover:text-red-300"
        >
          ✕
        </button>
      </div>

      {stats && (
        <div className="mb-4 space-y-1">
          <div className="text-yellow-400 font-semibold">Cache Stats:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Cached: <span className="text-blue-300">{stats.totalCached}</span></div>
            <div>Referenced: <span className="text-green-300">{stats.referenced}</span></div>
            <div>Avg Load: <span className="text-orange-300">{stats.avgLoadTime}</span></div>
            <div>Memory: <span className="text-purple-300">{stats.memoryUsage}</span></div>
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-1">
          <div className="text-yellow-400 font-semibold">Loading Report:</div>
          <div className="text-xs space-y-1">
            <div>Total Loads: <span className="text-blue-300">{report.totalLoads}</span></div>
            <div>Avg Time: <span className="text-green-300">{report.avgLoadTime}</span></div>
            {report.slowestModel && (
              <div>Slowest: <span className="text-red-300">{report.slowestModel.name} ({report.slowestModel.time})</span></div>
            )}
            {report.fastestModel && (
              <div>Fastest: <span className="text-green-300">{report.fastestModel.name} ({report.fastestModel.time})</span></div>
            )}
            {report.recentPerformance && (
              <div>Recent: <span className="text-yellow-300">{report.recentPerformance}</span></div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-600">
        <button
          onClick={() => {
            modelCache.clearCache();
            setStats(modelCache.getStats());
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs mr-2"
        >
          Clear Cache
        </button>
        <button
          onClick={() => {
            console.log('Model Stats:', stats);
            console.log('Performance Report:', report);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
        >
          Log to Console
        </button>
      </div>
    </div>
  );
}
