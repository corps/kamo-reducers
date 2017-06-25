import {ReductionWithEffect, SideEffect} from "../reducers";
import {sequence} from "../services/sequence";
import {clearDebounce, debounce} from "../services/debounce";
export interface InputChange<T> {
  type: 'input-change',
  target: keyof T,
  text: string
}

export interface ApplyInputChange<T> {
  type: 'apply-input-change',
  target: keyof T,
  text: string
}

export type InputAction<T> = InputChange<T> | ApplyInputChange<T>;

export function applyInputChange<T>(target: keyof T, text: string): ApplyInputChange<T> {
  return {type: "apply-input-change", target, text};
}

export function inputChange<T>(target: keyof T, text: string): InputChange<T> {
  return {type: "input-change", target, text};
}

export function inputChangeDispatcher<T>(parentDispatch: (a: InputAction<T>) => void,
                                         target: keyof T, dispatchApplyOnNewOrClearInput = false) {
  let lastValue = "";
  return (e: { stopPropagation: () => void, target: any }) => {
    e.stopPropagation();

    let wasEmpty = !lastValue;
    let curValue = lastValue = (e.target as HTMLInputElement).value;
    if (dispatchApplyOnNewOrClearInput && (wasEmpty && curValue || !wasEmpty && !curValue)) {
      parentDispatch(applyInputChange<T>(target, curValue));
    }
    else {
      parentDispatch(inputChange<T>(target, curValue));
    }
  }
}

export function applyInputChangeDispatcher<T>(parentDispatch: (a: ApplyInputChange<T>) => void,
                                              target: keyof T,
                                              ...value: string[]) {
  return (e: { stopPropagation: () => void, target: any }) => {
    e.stopPropagation();
    parentDispatch(applyInputChange<T>(target,
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
      effect = sequence(effect, debounce(applyInputChange<T>(a.target, a.text), "input-change-" + a.target));
      break;

    case 'apply-input-change':
      effect = sequence(effect, clearDebounce("input-change-" + a.target));
      if (state[a.target] === a.text) break;

      state = {...state};
      state[a.target] = a.text;
      break;
  }

  return {state: state as T, effect};
}
