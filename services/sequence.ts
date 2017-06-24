import {GlobalAction, SideEffect} from "../reducers";
import {Subject, Subscriber, Subscription} from "../subject";
export interface Sequenced {
  effectType: 'sequenced',
  effects: SideEffect[]
}

export function withSequenced(effect$: Subject<SideEffect>,): Subscriber<GlobalAction> {
  return {
    subscribe: (listener: (action: GlobalAction) => void) => {
      let subscription = new Subscription();
      let inputEffect$ = effect$ as Subscriber<Sequenced>;

      subscription.add(inputEffect$.subscribe(effect => {
        switch (effect.effectType) {
          case 'sequenced':
            for (let e of effect.effects) {
              if (!e) continue;
              effect$.dispatch(e);
            }
        }
      }));

      return subscription.unsubscribe;
    }
  }
}

export function sequence(first: SideEffect | 0, next: SideEffect | 0): SideEffect {
  if (!first) return next as SideEffect;
  if (!next) return first as SideEffect;

  if (first.effectType === "sequenced") {
    return {...first, effects: (first as Sequenced).effects.concat([next])} as Sequenced;
  }

  return {effectType: 'sequenced', effects: [first, next]} as Sequenced;
}

