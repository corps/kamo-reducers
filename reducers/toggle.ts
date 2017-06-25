import {ReductionWithEffect} from "../reducers";
export interface Toggle<T> {
  type: 'toggle',
  target: keyof T,
  on?: boolean
}

export function toggle<T>(target: keyof T, on = undefined as boolean): Toggle<T> {
  return {type: "toggle", on, target};
}

export function toggleDispatcher<T>(dispatch: (a: Toggle<T>) => void,
                                    target: keyof T,
                                    on = undefined as boolean) {
  return (e?: { stopPropagation: () => void }) => {
    if (e) {
      e.stopPropagation();
    }
    dispatch(toggle<T>(target, on));
  }
}

export interface ToggleMap {
  [k: string]: boolean
}

export function mutuallyExclude<T extends ToggleMap>(oldToggles: T,
                                                     newToggles: T,
                                                     exclusions: (keyof T)[]) {

  let firstWinner = null as string;
  let secondWinner = null as string;
  for (let k of exclusions) {
    if (newToggles[k]) {
      if (!firstWinner) {
        firstWinner = k;
        if (!oldToggles[k]) secondWinner = k;
      } else if (!secondWinner && !oldToggles[k]) {
        newToggles[firstWinner] = false;
        secondWinner = k;
      } else {
        newToggles[k] = false;
      }
    }
  }
}

export function reduceToggle<T extends ToggleMap>(state: ToggleMap, a: Toggle<T>): ReductionWithEffect<T> {
  switch (a.type) {
    case 'toggle':
      let result: boolean;
      if (a.on != null) {
        result = !!a.on;
      } else {
        result = !state[a.target];
      }

      if (result !== !!state[a.target]) {
        state = {...state} as T;
        state[a.target] = result;
      }
  }
  return {state: state as T};
}
