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

export class BufferedSubject<T> implements Subject<T> {
  queue = [] as T[];
  stack = [] as T[];
  buffering = true;

  private flush$ = new Subject<T>();

  dispatch = (t: T) => {
    this.queue.push(t);
    if (!this.buffering) {
      this.flushUntilEmpty();
    }
  };

  subscribe = (dispatch: (t: T) => void) => {
    return this.flush$.subscribe(dispatch);
  };

  flushNext = () => {
    const next = this.queue.shift();
    this.executeFlush(next);
    return next;
  };

  flushCurrent = () => {
    let queue = this.queue;
    this.queue = [];

    while (queue.length) {
      this.executeFlush(queue.shift());
    }

    return queue;
  };

  flushUntilEmpty = () => {
    let flushed = [] as T[];
    while (this.queue.length) {
      let next = this.queue.shift();
      flushed.push(next);
      this.executeFlush(next);
    }

    return flushed;
  };

  private executeFlush(t: T) {
    this.stack.push(t);
    this.flush$.dispatch(t);
    this.stack.pop();
  }
}

export class Subscription {
  private subscriptions = [] as (() => void)[];

  add(cleanup: (() => void) | Subscription) {
    if (!cleanup) return cleanup;

    if (cleanup instanceof Subscription) {
      this.subscriptions.push(cleanup.unsubscribe);
    }
    else {
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
