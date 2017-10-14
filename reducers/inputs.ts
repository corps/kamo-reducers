import {ReductionWithEffect} from "../reducers";

export interface InputChange<T> {
  type: 'input-change',
  target: keyof T,
  value: string
}

export function inputChange<T>(target: keyof T, value: string): InputChange<T> {
  return {
    type: "input-change",
    target,
    value
  };
}

export function inputChangeDispatcher<T, S = string>(dispatch: (a: InputChange<T>) => void,
                                                     target: keyof T, value?: S) {
  return (e: { stopPropagation: () => void, target: any }) => {
    e.stopPropagation();
    dispatch(inputChange<T>(target, value === undefined ? e.target.value : value));
  }
}

export interface InputMap {
  [k: string]: { value: string }
}

export function reduceInputs<T extends InputMap>(state: InputMap, a: InputChange<T>): ReductionWithEffect<T> {
  switch (a.type) {
    case 'input-change':
      state = {...state};
      state[a.target] = { value: a.value };
      break;
  }

  return {state: state as T};
}
