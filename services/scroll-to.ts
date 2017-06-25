import {Subscriber} from "../subject";
import {GlobalAction} from "../reducers";

export interface ScrollTo {
  effectType: 'scroll-to',
  targetSelector: string
}

export function scrollTo(targetSelector: string): ScrollTo {
  return {effectType: 'scroll-to', targetSelector};
}

export function withScrollTo(effect$: Subscriber<ScrollTo>): Subscriber<GlobalAction> {
  return {
    subscribe: () => {
      return effect$.subscribe(effect => {

        switch (effect.effectType) {
          case 'scroll-to':
            let element = document.querySelector(effect.targetSelector) as HTMLElement;
            if (element != null) {
              element.scrollIntoView();
            }
        }
      })
    }
  };
}

