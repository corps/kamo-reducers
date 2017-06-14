import {Dispatcher, Subject, Subscriber, Subscription} from "./subject";
export type GlobalAction = { type: string };
export type SideEffect = { effectType: string };
export type ReductionWithEffect<State extends Object> = { state: State, effect?: SideEffect | 0 };
export type Reducer <State extends object> = (state: State, action: GlobalAction) => ReductionWithEffect<State>
export type IgnoredSideEffect = { effectType: '' };
export type IgnoredAction = { type: '' };

export type Renderer<State extends object, Action extends GlobalAction> =
  (state: State | 0, effect: SideEffect | 0,
   dispatchAction: (a: Action) => void,
   dispatchEffect: (e: SideEffect) => void) => void;

export type Service = (sideEffect$: Subject<SideEffect>) => Subscriber<GlobalAction>;

export function connectRendererAndReducer<State extends object, Action extends GlobalAction>(renderer: Renderer<State, Action>,
                                                                                             reducer: Reducer<State>,
                                                                                             services: Service[],
                                                                                             initialState: State = undefined): () => void {
  let subscription = new Subscription();

  let action$ = new Subject<Action>();
  let effect$ = new Subject<SideEffect>();

  subscription.add(connectSideEffects(action$, effect$, services));
  subscription.add(reductionsOf<State>(reducer, action$, initialState).subscribe(reduction => {
    renderer(reduction.state, reduction.effect, action$.dispatch, effect$.dispatch);
  }));

  return subscription.unsubscribe;
}

export function reductionsOf<State extends object>(reducer: Reducer<State>,
                                                   action$: Subscriber<GlobalAction>,
                                                   initialState: State = undefined): Subscriber<ReductionWithEffect<State>> {
  return {
    subscribe: (dispatch: (reduction: ReductionWithEffect<State>) => void) => {
      let curState: State = initialState;
      return action$.subscribe((action: GlobalAction) => {
        let reduction = reducer(curState, action);
        curState = reduction.state || curState;
        dispatch(reduction);
      });
    }
  };
}

export function connectSideEffects(action$: Dispatcher<GlobalAction>,
                                   sideEffect$: Subject<SideEffect>,
                                   services: Service[]): () => void {
  let subscription = new Subscription();

  let uninstalled = services.slice();
  let installed = false;

  function installServices() {
    if (installed) return;

    while (uninstalled.length) {
      let next = uninstalled.shift();
      if (!next) continue;
      subscription.add(next(sideEffect$).subscribe(a => {
        installServices();
        action$.dispatch(a);
      }))
    }

    installed = true;
  }

  installServices();

  return subscription.unsubscribe;
}
