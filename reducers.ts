import {BufferedSubject, Subject, Subscriber, Subscription} from "./subject";
export type GlobalAction = { type: string };
export type SideEffect = { effectType: string };
export type ReductionWithEffect<State extends Object> = { state: State, effect?: SideEffect | 0 };
export type Reducer <State extends object> = (state: State, action: GlobalAction) => ReductionWithEffect<State>
export type IgnoredSideEffect = { effectType: '' };
export type IgnoredAction = { type: '' };

export type Renderer<State extends object, Action extends GlobalAction> =
  (state: State | 0, dispatchAction: (a: Action) => void, next: () => void) => void;

export type Service = (sideEffect$: Subject<SideEffect>) => Subscriber<GlobalAction>;

export function isSideEffect(ae: SideEffect | GlobalAction): ae is SideEffect {
  return 'effectType' in ae;
}

export type RenderUpdate<State, Action extends GlobalAction> = ["a", Action] | ["s", State] | ["e", SideEffect];

export function renderings<State extends object, Action extends GlobalAction>(renderer: Renderer<State, Action>,
                                                                              reducer: Reducer<State>,
                                                                              services: Service[],
                                                                              initialState: State = undefined): Subscriber<RenderUpdate<State, Action>> {
  return {
    subscribe: (dispatch: (update: RenderUpdate<State, Action>) => void) => {
      let subscription = new Subscription();
      let action$ = new Subject<Action>();
      let effect$ = new BufferedSubject<SideEffect>();
      let render = (s: State) => renderer(s, action$.dispatch, effect$.flushUntilEmpty);
      let curState = initialState;

      subscription.add(action$.subscribe((action: Action) => {
        let reduction = reducer(curState, action);
        let reducedState = reduction.state;
        if (reducedState) curState = reducedState;
        if (reduction.effect) effect$.dispatch(reduction.effect);
        if (reducedState) render(curState);
      }));

      subscription.add(serviceActions(effect$, services).subscribe(a => action$.dispatch(a as Action)));
      render(initialState);

      return subscription.unsubscribe;
    }
  }
}

function serviceActions(effect$: Subscriber<SideEffect>,
                        services: Service[]): Subscriber<GlobalAction> {
  return {
    subscribe: (dispatch: (a: GlobalAction) => void) => {
      let sideEffect$ = new Subject<SideEffect>();
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
            dispatch(a);
          }))
        }

        installed = true;
      }

      try {
        subscription.add(effect$.subscribe(e => sideEffect$.dispatch(e)));
        installServices();
      } catch (e) {
        subscription.unsubscribe();
        throw e;
      }

      return subscription.unsubscribe;
    }
  }
}
