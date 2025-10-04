import { MetricSample } from './types';

type PerformanceMonitorOptions = {
  sampleIntervalMs: number;
  onSample: (sample: MetricSample) => void;
  logger?: {
    debug: (message: string, metadata?: unknown) => void;
    warn: (message: string, metadata?: unknown) => void;
  };
};

export class PerformanceMonitor {
  private intervalId: number | null = null;
  private frameHandle: number | null = null;
  private frameCount = 0;
  private frameStart = 0;
  private longTaskCount = 0;
  private longTaskDuration = 0;
  private performanceObserver?: PerformanceObserver;

  constructor(private readonly options: PerformanceMonitorOptions) {}

  start() {
    if (typeof window === 'undefined' || typeof performance === 'undefined') {
      this.options.logger?.warn('PerformanceMonitor disabled: performance API not available.');
      return;
    }

    if (this.intervalId !== null) {
      return;
    }

    this.frameStart = performance.now();
    const measureFrame = (timestamp: number) => {
      this.frameCount += 1;
      if (timestamp - this.frameStart >= 1000) {
        this.frameStart = timestamp;
        this.frameCount = 0;
      }
      this.frameHandle = window.requestAnimationFrame(measureFrame);
    };
    this.frameHandle = window.requestAnimationFrame(measureFrame);

    if ('PerformanceObserver' in window && typeof PerformanceObserver === 'function') {
      try {
        this.performanceObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if ('duration' in entry) {
              this.longTaskCount += 1;
              this.longTaskDuration += entry.duration;
            }
          }
        });
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        this.options.logger?.warn('Failed to start PerformanceObserver for long tasks.', { error });
      }
    }

    this.intervalId = window.setInterval(() => {
      const now = Date.now();
      const fps = this.computeFps();
      const memorySample = this.sampleMemory();
      const sample: MetricSample = {
        timestamp: now,
        fps,
        longTaskCount: this.longTaskCount,
        longTaskDuration: Number(this.longTaskDuration.toFixed(2)),
        memory: memorySample,
      };
      this.longTaskCount = 0;
      this.longTaskDuration = 0;
      this.options.onSample(sample);
    }, this.options.sampleIntervalMs);
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.frameHandle !== null) {
      window.cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
    if (this.performanceObserver) {
      try {
        this.performanceObserver.disconnect();
      } catch (error) {
        this.options.logger?.warn('Failed to disconnect PerformanceObserver.', { error });
      }
      this.performanceObserver = undefined;
    }
  }

  private computeFps(): number | undefined {
    if (typeof window === 'undefined' || this.frameHandle === null) {
      return undefined;
    }

    const elapsed = performance.now() - this.frameStart;
    if (elapsed <= 0) {
      return undefined;
    }
    return Number(((this.frameCount / elapsed) * 1000).toFixed(2));
  }

  private sampleMemory(): MetricSample['memory'] | undefined {
    const perf = performance as Performance & {
      memory?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
      };
    };

    if (!perf.memory) {
      return undefined;
    }

    return {
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      usedJSHeapSize: perf.memory.usedJSHeapSize,
    };
  }
}
