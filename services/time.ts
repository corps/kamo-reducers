import {Subject, Subscriber, Subscription} from "../subject";
import {GlobalAction, IgnoredAction, IgnoredSideEffect, ReductionWithEffect, SideEffect} from "../reducers";
export interface TimeState {
  now: number,
  relativeNow: number
}

export interface UpdateTime {
  type: "update-time",
  absoluteTime: number,
  relativeTime: number
}

export interface RequestTick {
  effectType: "request-tick",
  after: number
}

export function requestTick(after: number): RequestTick {
  return {
    effectType: "request-tick",
    after
  }
}

export function updateTime(absoluteTime: number, relativeTime: number): UpdateTime {
  return {type: "update-time", absoluteTime, relativeTime};
}

export function reduceTime<T extends TimeState>(state: T, action: UpdateTime | IgnoredAction): ReductionWithEffect<T> {
  let effect: SideEffect | 0 = null;

  switch (action.type) {
    case "update-time":
      state = {...(state as any)};
      state.now = action.absoluteTime;
      state.relativeNow = action.relativeTime;
      break;
  }
  return {state, effect};
}

export function withTime(start = Date.now()) {
  return (effect$: Subject<SideEffect>): Subscriber<UpdateTime> => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        const subscription = new Subscription();
        const timeoutSubscription = new Subscription();
        subscription.add(timeoutSubscription.unsubscribe);

        let lastTimeoutTime: number;

        subscription.add(effect$.subscribe((effect: RequestTick | IgnoredSideEffect) => {
          switch (effect.effectType) {
            case "request-tick":
              let now = Date.now();
              let requested = now + effect.after;
              if (lastTimeoutTime == null || lastTimeoutTime > requested) {
                timeoutSubscription.unsubscribe();
                lastTimeoutTime = requested;
                let handle = setTimeout(() => {
                  lastTimeoutTime = null;
                  let now = Date.now();
                  dispatch(updateTime(now, now - start));
                }, effect.after);
                timeoutSubscription.add(() => clearTimeout(handle));
              }
              break;
          }
        }));

        effect$.dispatch(requestTick(0));

        return subscription.unsubscribe;
      }
    }
  }
}
