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
  buffer = [] as T[];
  stack = [0] as number[];
  buffering = true;

  private flush$ = new Subject<T>();

  getRightOffset() {
    var result = 0;
    for (var i = 0; i < this.stack.length - 1; ++i) {
      result += this.stack[i];
    }
    return result;
  }

  dispatch = (t: T) => {
    this.buffer.splice(this.buffer.length - this.getRightOffset(), 0, t);
    ++this.stack[this.stack.length - 1];

    if (!this.buffering) {
      this.flushUntilEmpty();
    }
  };

  subscribe = (dispatch: (t: T) => void) => {
    return this.flush$.subscribe(dispatch);
  };

  flushNext = () => {
    if (this.buffer.length) {
      let next = this.takeNext();
      this.executeFlush(next);
      return next;
    }
    return undefined;
  };

  flushUntilEmpty = () => {
    let flushed = [] as T[];

    while (this.buffer.length) {
      let next = this.takeNext();
      flushed.push(next);
      this.executeFlush(next);
    }

    return flushed;
  };

  private takeNext() {
    var i = this.stack.length - 1;
    while (i >= 0 && this.stack[i] <= 0) {
      --i;
    }

    this.stack[i]--;
    return this.buffer.shift();
  }

  private executeFlush(t: T) {
    this.stack.push(0);
    this.flush$.dispatch(t);
    let remaining = this.stack.pop();
    this.stack[this.stack.length - 1] += remaining;
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
