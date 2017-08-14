import {GlobalAction, IgnoredSideEffect, SideEffect} from "../reducers";
import {Subject, Subscriber, Subscription} from "../subject";

export interface Debounce {
  effectType: "debounce"
  action: GlobalAction
  debounceMs: number
  name: string
}

export interface ClearDebounce {
  effectType: "clear-debounce"
  name: string
}

export interface FlushDebounce {
  effectType: "flush-debounce"
  name: string
}

export type DebounceEffect = Debounce | ClearDebounce | FlushDebounce

export function flushDebounce(name: string): FlushDebounce {
  return {effectType: "flush-debounce", name}
}

export function clearDebounce(name: string): ClearDebounce {
  return {effectType: "clear-debounce", name}
}

export function debounce(action: GlobalAction,
                         name: string,
                         debounceMs = 300): Debounce {
  return {
    effectType: "debounce",
    action, debounceMs, name
  }
}

export function withDebounce(effect$: Subject<SideEffect>): Subscriber<GlobalAction> {
  return {
    subscribe: (dispatch: (action: GlobalAction) => void) => {
      const subscription = new Subscription();

      let timeouts = {} as {
        [k: string]: {
          handle: number,
          action: GlobalAction
        }
      };

      let canceled = false;

      subscription.add(() => canceled = true);

      subscription.add(effect$.subscribe((e: DebounceEffect | IgnoredSideEffect) => {
        switch (e.effectType) {
          case "flush-debounce":
            var timeout = timeouts[e.name];
            if (timeout) {
              timeouts[e.name] = null;
              clearTimeout(timeout.handle);
              dispatch(timeout.action);
            }
            break;

          case "clear-debounce":
            var timeout = timeouts[e.name];
            if (timeout) {
              timeouts[e.name] = null;
              clearTimeout(timeout.handle);
            }
            break;

          case "debounce":
            var timeout = timeouts[e.name];
            if (timeout) {
              timeouts[e.name] = null;
              clearTimeout(timeout.handle);
            }

            const run = () => {
              timeouts[e.name] = null;
              dispatch(e.action);
            };

            timeouts[e.name] = {handle: setTimeout(run, e.debounceMs), action: e.action};
            break;
        }
      }));

      subscription.add(function () {
        for (let k in timeouts) {
          if (!timeouts[k]) continue;
          clearTimeout(timeouts[k].handle);
        }
      });

      return subscription.unsubscribe;
    }
  }
}
