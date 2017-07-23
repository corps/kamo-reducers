import {SimpleSynchronousStorage} from "./services/synchronous-storage";

export class MemoryStorage implements SimpleSynchronousStorage {
  values = {} as { [k: string]: string };

  clear(): void {
    this.values = {};
  }

  getItem(key: string): string | any {
    return this.values[key];
  }

  setItem(key: string, data: string): void {
    this.values[key] = data;
  }
}
