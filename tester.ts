import {GlobalAction, Reducer, Service, serviceOutputs, SideEffect} from "./reducers";
import {BufferedSubject, Subject, Subscription} from "./subject";
import {trackMutations} from "./track-mutations";
import {isSideEffect} from "./reducers";
import {Sequenced} from "./services/sequence";

export class Tester<State> {
  constructor(reducer: Reducer<State>, public state: State) {
    this.reducer = trackMutations(reducer);
  }

  start() {
    this.subscription.add(this.queuedAction$.subscribe(this.flushedDispatch));
    this.subscription.add(serviceOutputs(this.queuedEffect$, this.services).subscribe(this.queued$.dispatch));
  }

  subscription = new Subscription();
  queued$ = new BufferedSubject<GlobalAction | SideEffect>();
  reducer: Reducer<State>;
  update$ = new Subject<[GlobalAction, State]>();

  services = [] as Service[];

  private queuedEffect$: Subject<SideEffect> = {
    dispatch: this.queued$.dispatch,
    subscribe: (listener: (effect: SideEffect) => void) => {
      return this.queued$.subscribe((ea) => {
        if (isSideEffect(ea)) {
          listener(ea);
        }
      })
    }
  };

  private queuedAction$: Subject<GlobalAction> = {
    dispatch: this.queued$.dispatch,
    subscribe: (listener: (action: GlobalAction) => void) => {
      return this.queued$.subscribe((ea) => {
        if (!isSideEffect(ea)) {
          listener(ea);
        }
      })
    }
  };

  private flushedDispatch = (action: GlobalAction) => this.dispatch(action, false);
  dispatch = (action: GlobalAction, clearQueue = true) => {
    if (clearQueue) {
      this.queued$.clear();
    }

    let reduction = this.reducer(this.state, action as any);

    this.state = reduction.state;
    this.update$.dispatch([action, this.state]);

    if (reduction.effect) {
      this.queued$.dispatch(reduction.effect);
    }
  };

  findEffects(type: string, ea = this.queued$.buffer): SideEffect[] {
    let result = [] as SideEffect[];

    ea.forEach((e: GlobalAction | SideEffect) => {
      if (isSideEffect(e)) {
        if (e.effectType == "sequenced") {
          let sequenced: Sequenced = e as Sequenced;
          result = result.concat(this.findEffects(type, sequenced.effects));
        }

        if (e.effectType == type) {
          result = result.concat([e]);
        }
      }
    });

    return result;
  }

  findActions(type: string, ea = this.queued$.buffer): GlobalAction[] {
    return ea.filter((e: GlobalAction | SideEffect) => {
      if (isSideEffect(e)) {
        return false;
      }
      return e.type == type;
    }) as GlobalAction[];
  }
}