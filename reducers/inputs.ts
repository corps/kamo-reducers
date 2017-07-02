import {GlobalAction, ReductionWithEffect, SideEffect} from "../reducers";
import {sequence} from "../services/sequence";
import {clearDebounce, debounce} from "../services/debounce";

export interface InputChange<T> {
  type: 'input-change',
  target: keyof T,
  debounceName: string,
  debounceAction: GlobalAction,
  text: string
}

export interface ApplyInputChange<T> {
  type: 'apply-input-change',
  target: keyof T,
  text: string,
  debounceName: string,
}

export type InputAction<T> = InputChange<T> | ApplyInputChange<T>;

export function applyInputChange<T>(target: keyof T, text: string): ApplyInputChange<T> {
  return {type: "apply-input-change", target, text, debounceName: "input-change-" + target};
}

export function inputChange<T>(target: keyof T, text: string): InputChange<T> {
  return {
    type: "input-change",
    target,
    text,
    debounceName: "input-change-" + target,
    debounceAction: applyInputChange<T>(target, text),
  };
}

export function inputChangeDispatcher<T>(dispatch: (a: InputAction<T>) => void,
                                         target: keyof T,
                                         lastValue = "",
                                         dispatchApplyOnNewOrClearInput = false) {
  return (e: { stopPropagation: () => void, target: any }) => {
    e.stopPropagation();

    let wasEmpty = !lastValue;
    lastValue = (e.target as HTMLInputElement).value;
    if (dispatchApplyOnNewOrClearInput && (wasEmpty && lastValue || !wasEmpty && !lastValue)) {
      dispatch(applyInputChange<T>(target, lastValue));
    }
    else {
      dispatch(inputChange<T>(target, lastValue));
    }
  }
}

export function applyInputChangeDispatcher<T>(dispatch: (a: ApplyInputChange<T>) => void,
                                              target: keyof T,
                                              ...value: string[]) {
  return (e: { stopPropagation: () => void, target: any }) => {
    e.stopPropagation();
    dispatch(applyInputChange<T>(target,
      value.length ? value[0] : (e.target as HTMLInputElement).value));
  }
}

export interface InputMap {
  [k: string]: string
}

export function reduceInputs<T extends InputMap>(state: InputMap, a: InputAction<T>): ReductionWithEffect<T> {
  let effect: SideEffect | 0 = null;
  switch (a.type) {
    case 'input-change':
      effect = sequence(effect, debounce(a.debounceAction, a.debounceName));
      break;

    case 'apply-input-change':
      effect = sequence(effect, clearDebounce(a.debounceName));
      if (state[a.target] === a.text) break;

      state = {...state};
      state[a.target] = a.text;
      break;
  }

  return {state: state as T, effect};
}
