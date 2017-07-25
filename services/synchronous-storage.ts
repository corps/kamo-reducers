import {Subject, Subscriber, Subscription} from "../subject";
import {GlobalAction, IgnoredSideEffect, SideEffect} from "../reducers";
import {ClearLocalData, loadLocalData, RequestLocalData, StoreLocalData} from "./local-storage";
export interface SimpleSynchronousStorage {
  clear(): void,
  getItem(key: string): any,
  setItem(key: string, value: any): void
}

export function withSynchronousStorage(storage: SimpleSynchronousStorage = window.localStorage,
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
