import {GlobalAction, IgnoredSideEffect, ReductionWithEffect, SideEffect} from "../reducers";
import {Subject, Subscriber, Subscription} from "../subject";
export interface Sequenced {
  effectType: 'sequenced',
  effects: SideEffect[]
}

export function withSequenced(effect$: Subject<SideEffect>): Subscriber<GlobalAction> {
  return {
    subscribe: (dispatch: (action: GlobalAction) => void) => {
      let subscription = new Subscription();
      subscription.add(effect$.subscribe((effect: Sequenced | IgnoredSideEffect) => {
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


export function sequenceReduction<State>(effect: SideEffect | 0, reduction: ReductionWithEffect<State>): ReductionWithEffect<State> {
  effect = sequence(effect, reduction.effect);

  return {state: reduction.state, effect};
}
