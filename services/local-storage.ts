import {GlobalAction, IgnoredSideEffect, SideEffect} from "kamo-reducers/reducers";
import {Subject, Subscriber, Subscription} from "kamo-reducers/subject";

export interface StoreLocalData {
  effectType: "store-local-data",
  data: object,
  key: string
}

export interface RequestLocalData {
  effectType: "request-local-data"
  key: string
}

export interface LoadLocalData {
  type: "load-local-data"
  key: string
  data: object | 0
}

export interface ClearLocalData {
  effectType: "clear-local-data"
}

export const clearLocalData: ClearLocalData = {effectType: "clear-local-data"};

export function storeLocalData(key: string, data: object): StoreLocalData {
  return {effectType: "store-local-data", key, data};
}

export function loadLocalData(key: string, data: object): LoadLocalData {
  return {type: "load-local-data", key, data};
}

export function requestLocalData(key: string): RequestLocalData {
  return {effectType: "request-local-data", key};
}

export interface SimpleStringStorage {
  clear(): void,
  getItem(key: string): string,
  setItem(key: string, value: string): void
}

export function withStorage(storage: SimpleStringStorage = window.localStorage,
                            inputFilter = (s: any) => JSON.stringify(s),
                            outputFiler = (s: string | 0) => s ? JSON.parse(s) : null) {
  return (effect$: Subject<SideEffect>): Subscriber<GlobalAction> => {
    return {
      subscribe: (dispatch: (a: GlobalAction) => void) => {
        let subscription = new Subscription();
        let raw: string;

        subscription.add(effect$.subscribe((effect: StoreLocalData | RequestLocalData | ClearLocalData | IgnoredSideEffect) => {
          switch (effect.effectType) {
            case "clear-local-data":
              storage.clear();
              break;

            case "store-local-data":
              raw = inputFilter(effect.data);
              storage.setItem(effect.key, raw);
              break;

            case "request-local-data":
              raw = storage.getItem(effect.key);
              let data = outputFiler(raw);
              dispatch(loadLocalData(effect.key, data));
              break;
          }
        }));

        return subscription.unsubscribe;
      }
    };
  }
}
