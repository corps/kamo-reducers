import {BufferedSubject, Subject, Subscriber, Subscription} from "./subject";
import {sequence} from "./services/sequence";
export type GlobalAction = { type: string };
export type SideEffect = { effectType: string };
export type ReductionWithEffect<State extends Object> = { state: State, effect?: SideEffect | 0 };
export type Reducer <State> = (state: State, action: GlobalAction) => ReductionWithEffect<State>
export type IgnoredSideEffect = { effectType: '' };
export type IgnoredAction = { type: '' };

export type Renderer<State, Action extends GlobalAction> =
  (state: State | 0, dispatchAction: (a: Action) => void, next: () => void) => void;

export type Service = (sideEffect$: Subject<SideEffect>) => Subscriber<GlobalAction>;

export function isSideEffect(ae: SideEffect | GlobalAction): ae is SideEffect {
  return 'effectType' in ae;
}

export type RenderUpdate<State, Action extends GlobalAction> =
  ["a", Action] |
  ["s", State] |
  ["e", SideEffect] |
  ["r"] |
  ["c"];

const renderStart = ["r"] as ["r"];
const renderComplete = ["c"] as ["c"];

export function renderLoop<State, Action extends GlobalAction>(renderer: Renderer<State, Action>,
                                                               reducer: Reducer<State>,
                                                               services: Service[],
                                                               initialState: State = undefined): Subscriber<RenderUpdate<State, Action>> {
  return {
    subscribe: (dispatch: (update: RenderUpdate<State, Action>) => void) => {
      let subscription = new Subscription();
      let action$ = new Subject<GlobalAction>();
      let effect$ = new BufferedSubject<SideEffect>();
      let render = (s: State) => renderer(s, action$.dispatch, effect$.flushUntilEmpty);
      let curState = initialState;

      subscription.add(effect$.subscribe(e => dispatch(["e", e])));
      subscription.add(action$.subscribe((action: Action) => {
        dispatch(["a", action]);
        let reduction = reducer(curState, action);
        let reducedState = reduction.state;
        dispatch(["s", reducedState]);
        curState = reducedState;
        if (reduction.effect) {
          effect$.dispatch(reduction.effect)
        }
        dispatch(renderStart);
        render(curState);
        dispatch(renderComplete);
      }));

      subscription.add(serviceActions(effect$, services).subscribe(a => action$.dispatch(a as Action)));
      action$.dispatch({type: "@init"});

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

      const installThenDispatch = (a: GlobalAction) => {
        installServices();
        dispatch(a);
      };

      function installServices() {
        if (installed) return;

        while (uninstalled.length) {
          let next = uninstalled.shift();
          if (!next) continue;

          subscription.add(next(sideEffect$).subscribe(installThenDispatch))
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

export function reducerChain<State>(reduction: ReductionWithEffect<State>, action: GlobalAction) {
  const chainer = {
    ...reduction,
    apply: (reducer: Reducer<State>) => {
      let reduction = reducer(chainer.state, action);
      chainer.effect = sequence(chainer.effect, reduction.effect);
      chainer.state = reduction.state;
      return chainer;
    },

    applySub: <K extends keyof State>(k: K, reducer: Reducer<State[K]>) => {
      let subReduction = reducer(chainer.state[k] as any, action);
      chainer.effect = sequence(chainer.effect, subReduction.effect);

      if (chainer.state[k] !== subReduction.state) {
        chainer.state = {...(chainer.state as any)};
        chainer.state[k] = subReduction.state;
      }
      return chainer
    },

    finish: () => {
      return {state: chainer.state, effect: chainer.effect};
    }
  };

  return chainer;
}
