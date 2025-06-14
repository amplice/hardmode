// Simple EventEmitter implementation for browser
export class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  once(event: string, listener: (...args: any[]) => void): void {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.slice().forEach(listener => {
        listener(...args);
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}