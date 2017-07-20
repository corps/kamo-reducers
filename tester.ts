export class Tester {
  constructor() {
  }

  start(autoFlushQueue = false) {
    this.subscription.add(this.queuedAction$.subscribe(this.flushedDispatch));
    this.subscription.add(serviceActions(autoFlushQueue ? new Subject() : this.queuedEffect$, this.services)
        .subscribe(autoFlushQueue ? this.flushedDispatch : this.queuedAction$.dispatch));
  }

  serviceConfig = (function () {
    let config = {...newServiceConfig};
    config.storage = new MemoryStorage() as any;
    return config;
  })();

  subscription = new Subscription();
  state = initialState;
  queued$ = new BufferedSubject<GlobalAction | SideEffect>();
  reducer = trackMutations(reducer);

  update$ = new Subject<[GlobalAction, State]>();

  private services = getServices(this.serviceConfig);
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
    console.log(action);
    if (clearQueue) {
      this.queued$.queue.length = 0;
    }

    let reduction = this.reducer(this.state, action as any);

    this.state = reduction.state;
    this.update$.dispatch([action, this.state]);

    if (reduction.effect) {
      this.queued$.dispatch(reduction.effect);
    }
  };

  findEffects(type: string, ea = this.queued$.queue): SideEffect[] {
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

  findActions(type: string, ea = this.queued$.queue): GlobalAction[] {
    return ea.filter((e: GlobalAction | SideEffect) => {
      if (isSideEffect(e)) {
        return false;
      }
      return e.type == type;
    }) as GlobalAction[];
  }
}