import {GlobalAction, IgnoredSideEffect, ReductionWithEffect, SideEffect} from "../reducers";
import {Subject, Subscriber} from "../subject";
export type CalculationType = "expand-width" | "expand-height" | "as-is"

export interface CalculateSize {
  effectType: 'calculate-size'
  targetSelector: string
  calculationType: CalculationType
  name: string
}

export type Sizing = [number, number]

export interface SizeMap {
  [k: string]: Sizing
}

export type SizeUpdate<T extends SizeMap> = {
  type: 'size-update',
  name: keyof T,
  size: Sizing
}

export function calculateSize<T extends SizeMap>(name: keyof T,
                                                 id: string,
                                                 calculationType = "as-is" as CalculationType): CalculateSize {
  return {
    effectType: 'calculate-size',
    targetSelector: "#" + id,
    name,
    calculationType
  };
}

export function reduceSizings<T extends SizeMap>(state: SizeMap, a: SizeUpdate<T>): ReductionWithEffect<T> {
  switch (a.type) {
    case 'size-update':
      state = {...state};
      state[a.name] = a.size;
      break;
  }

  return {state: state as T};
}

export function sizeUpdate<T extends SizeMap>(name: keyof T, size: Sizing): SizeUpdate<SizeMap> {
  return {
    type: "size-update",
    name, size
  }
}

export function withSizeCalculator(effect$: Subject<SideEffect>): Subscriber<GlobalAction> {
  return {
    subscribe: (dispatch: (action: SizeUpdate<any>) => void) => {
      return effect$.subscribe((e: CalculateSize | IgnoredSideEffect) => {
        switch (e.effectType) {
          case 'calculate-size':
            let element = document.querySelector(e.targetSelector) as HTMLElement;
            if (element) {
              dispatch(sizeUpdate(e.name, getSize(element, e.calculationType)));
            }
        }
      });
    }
  }
}

function getSize(source: HTMLElement, type: CalculationType): Sizing {
  if (type === "as-is") {
    let bounding = source.getBoundingClientRect();
    return [bounding.width, bounding.height];
  }

  let calculator: HTMLElement;

  switch (type) {
    case "expand-height":
      calculator = document.createElement("DIV");
      copyComputedStyles(source, calculator);

      calculator.style.wordWrap = "break-word";
      calculator.style.whiteSpace = "pre-wrap";
      calculator.style.overflow = "show";
      calculator.style.height = "";
      break;
    case "expand-width":
      calculator = document.createElement("DIV");
      copyComputedStyles(source, calculator);

      calculator.style.whiteSpace = "no-wrap";
      calculator.style.overflow = "show";
      calculator.style.width = "";
      break;
  }
  if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement) {
    calculator.textContent = source.value;
  } else {
    calculator.innerHTML = source.innerHTML;
  }

  document.body.appendChild(calculator);
  try {
    let bounding = calculator.getBoundingClientRect();
    return [bounding.width, bounding.height];
  } finally {
    calculator.remove();
  }
}

function copyComputedStyles(from: HTMLElement, to: HTMLElement): void {
  let computedStyleObject = document.defaultView.getComputedStyle(from, null);
  if (!computedStyleObject) return null;

  let stylePropertyValid = function (value: any, prop: string) {
    return typeof value !== 'undefined' &&
      prop !== "length" &&
      typeof value !== 'object' &&
      typeof value !== 'function';
  };

  for (let property in computedStyleObject) {
    if (stylePropertyValid(computedStyleObject[property], property)) {
      to.style[property] = computedStyleObject[property];
    }
  }
}
