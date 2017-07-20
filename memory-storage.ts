import {SimpleStringStorage} from "./services/local-storage";
export class MemoryStorage implements SimpleStringStorage {
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
