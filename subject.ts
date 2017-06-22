export interface Dispatcher<T> {
  dispatch: (data: T) => void
}

export interface Subscriber<T> {
  subscribe: (listener: (d: T) => void) => () => void
}

export class Subject<T> implements Subscriber<T>, Dispatcher<T> {
  constructor() {
    let listeners = {} as { [k: number]: Function };
    let lastId = -1;
    this.dispatch = (data: T) => {
      for (let k in listeners) {
        listeners[k](data);
      }
    };

    this.subscribe = (listener: (d: T) => void) => {
      let id = ++lastId;
      listeners[id] = listener;
      return () => {
        delete listeners[id];
      }
    };
  }

  dispatch: (data: T) => void;
  subscribe: (listener: (data: T) => void) => () => void;
}

export function delayedValue<T>(timeout: number, v: T): Subscriber<T> {
  return {
    subscribe: (l: (n: T) => void) => {
      let h = setTimeout(() => {
        l(v);
      }, timeout);
      return () => clearTimeout(h);
    }
  }
}

export function selfCompletes<T>(sub: Subscriber<Notification<T>>,
                                 scope = new Subscription()): Subscriber<Notification<T>> {
  return {
    subscribe: (l: (n: Notification<T>) => void) => {
      scope.add(sub.subscribe(n => {
        if (n.t !== "value") scope.unsubscribe();
        l(n);
      }));

      return scope.unsubscribe;
    }
  }
}

export function backoffRepeater<T>(sub: Subscriber<Notification<T>>,): Subscriber<Notification<T>> {
  return {
    subscribe: (l: (t: Notification<T>) => void) => {
      let subscription = new Subscription();
      let failures = 0;

      let makeSubscription = () => {
        selfCompletes(sub, subscription).subscribe((n: Notification<T>) => {
          if (n.t === "done") {
            failures = 0;
            makeSubscription();
          } else if (n.t === "error") {
            failures++;
            let timeout = Math.pow(Math.min(failures, 5) + 1, 1.5) * ((Math.random() / 2) + 0.25) * 2500;
            subscription.add(delayedValue(timeout, null).subscribe(() => {
              makeSubscription();
            }));
          }

          l(n);
        });
      };

      makeSubscription();

      return subscription.unsubscribe;
    }
  }
}

export class BufferedSubject<T> implements Subject<T> {
  queue = [] as T[];
  flush$ = new Subject<T>();

  dispatch = (t: T) => {
    this.queue.push(t);
  };

  subscribe = (dispatch: (t: T) => void) => {
    return this.flush$.subscribe(dispatch);
  };

  flushNext = () => {
    const next = this.queue.shift();
    this.flush$.dispatch(next);
    return next;
  };

  flushCurrent = () => {
    let queue = this.queue;
    this.queue = [];

    while (queue.length) {
      this.flush$.dispatch(queue.shift());
    }

    return queue;
  };

  flushUntilEmpty = () => {
    let flushed = [] as T[];
    while (this.queue.length) {
      let next = this.queue.shift();
      flushed.push(next);
      this.flush$.dispatch(next);
    }

    return flushed;
  }
}

export type Notification<T extends {}> =
  { t: "value", v: T } | { t: "done" } | { t: "error", e: any }

export class Subscription {
  private subscriptions = [] as (() => void)[];

  add(cleanup: (() => void) | Subscription) {
    if (!cleanup) return cleanup;

    if (cleanup instanceof Subscription) {
      this.subscriptions.push(cleanup.unsubscribe);
    } else {
      this.subscriptions.push(cleanup)
    }

    return cleanup;
  }

  unsubscribe = () => {
    let subscriptions = this.subscriptions;
    let errors = [] as any[];
    this.subscriptions = [];

    for (let sub of subscriptions) {
      try {
        sub();
      } catch (e) {
        errors.push(e);
      }
    }

    if (errors.length) {
      errors.forEach(e => console.error(e));
      throw new Error("Exceptions raised while closing subscription, see above.");
    }
  }
}
