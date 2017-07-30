import {BufferedSubject, delayedValue, Subject, Subscription} from "./subject";

QUnit.module("subject");

let global: any = new Function('return this')();

QUnit.test("delayedValue produces a value after the given timeout, unless subscribed before then", () => {
  let oldTimeout = global.setTimeout;
  let oldClearTimeout = global.clearTimeout;

  let timeoutHandle = {};
  let setTimeoutCalls = [] as any[];
  let clearTimeoutCalls = [] as any[];
  global.setTimeout = (cb: any, time: any) => {
    setTimeoutCalls.push([cb, time]);
    return timeoutHandle;
  };

  global.clearTimeout = (h: any) => {
    clearTimeoutCalls.push(h);
  };

  try {
    QUnit.assert.equal(setTimeoutCalls.length, 0);

    let subscriber = delayedValue<number>(600, 10);
    QUnit.assert.equal(setTimeoutCalls.length, 0);


    let timeoutNumbers = [] as number[];
    let unsubscribe = subscriber.subscribe(n => timeoutNumbers.push(n));
    QUnit.assert.equal(setTimeoutCalls.length, 1);
    QUnit.assert.equal(setTimeoutCalls[0][1], 600);

    QUnit.assert.equal(timeoutNumbers.length, 0);
    setTimeoutCalls[0][0]();

    QUnit.assert.equal(clearTimeoutCalls.length, 0);
    unsubscribe();

    QUnit.assert.deepEqual(timeoutNumbers, [10]);
    QUnit.assert.equal(clearTimeoutCalls.length, 1);
    QUnit.assert.strictEqual(clearTimeoutCalls[0], timeoutHandle);
  } finally {
    global.setTimeout = oldTimeout;
    global.clearTimeout = oldClearTimeout;
  }
})

QUnit.test("Subscription.unscribe executes each added callback once, even nested calls", () => {
  let calls = 0;
  let cb = () => ++calls;

  let subscription = new Subscription();
  let subscription2 = new Subscription();
  subscription2.add(cb);
  subscription2.add(cb);

  let unsubscribe = subscription.unsubscribe;


  subscription.add(cb);
  subscription.add(subscription.unsubscribe);
  subscription.add(subscription2);
  subscription.add(subscription2);
  subscription.add(cb);
  subscription.add(cb);

  unsubscribe();
  QUnit.assert.equal(calls, 5);
});

QUnit.test("Subject.dispatch sends the given data to all registered callbacks", () => {
  let numbers = [] as number[];
  let subject = new Subject<number>();

  let subscribe = subject.subscribe;

  subscribe((v) => numbers.push(v));
  subscribe((v) => numbers.push(v + 10));

  let dispatch = subject.dispatch;

  dispatch(1);
  dispatch(3);
  dispatch(4);
  dispatch(1);
  dispatch(9);

  QUnit.assert.deepEqual(numbers, [1, 11, 3, 13, 4, 14, 1, 11, 9, 19]);
});

QUnit.test("Subject.dispatch will not call unsubscribed subscriptions, even if they occur as a result of another cb", () => {
  let numbers = [] as number[];
  let subject = new Subject<number>();

  let subscribe = subject.subscribe;

  let unsubscribe = subscribe((v) => numbers.push(v));
  subscribe((v) => {
    numbers.push(v + 10);
    unsubscribe();
  });

  let dispatch = subject.dispatch;

  dispatch(1);
  dispatch(3);
  dispatch(4);
  dispatch(1);
  dispatch(9);

  QUnit.assert.deepEqual(numbers, [1, 11, 13, 14, 11, 19]);
});

QUnit.test("Subject.subscribe's unsubscribe can be called multiple times safely.", () => {
  let numbers = [] as number[];
  let subject = new Subject<number>();

  let subscribe = subject.subscribe;

  let unsubscribe = subscribe((v) => numbers.push(v));
  subscribe((v) => numbers.push(v + 10));
  unsubscribe();
  unsubscribe();

  let dispatch = subject.dispatch;

  dispatch(1);
  dispatch(3);
  dispatch(4);
  dispatch(1);
  dispatch(9);

  QUnit.assert.deepEqual(numbers, [11, 13, 14, 11, 19]);
});

QUnit.test("Subject.subscribe's unsubscribe does not remove other subscriptions of the identical function", () => {
  let numbers = [] as number[];
  let subject = new Subject<number>();

  let subscribe = subject.subscribe;

  let cb = (v: number) => numbers.push(v);
  let unsubscribe = subscribe(cb);
  subscribe(cb);

  unsubscribe();

  let dispatch = subject.dispatch;

  dispatch(1);
  dispatch(3);
  dispatch(4);
  dispatch(1);
  dispatch(9);

  QUnit.assert.deepEqual(numbers, [1, 3, 4, 1, 9]);
});

function recordReceived(subject: Subject<number>,
                        received: number[],
                        cb: () => void) {

  let unsubscribe = subject.subscribe(n => {
    received.push(n);
    if (n === 1) {
      subject.dispatch(2);
      cb();
      subject.dispatch(3);
      cb();
      subject.dispatch(11);
      cb();
    }

    if (n === 3) {
      subject.dispatch(4);
      cb();
      subject.dispatch(7);
      cb();
      subject.dispatch(8);
      cb();
    }

    if (n === 4) {
      subject.dispatch(5);
      cb();
    }

    if (n === 5) {
      subject.dispatch(6);
      cb();
    }

    if (n === 8) {
      subject.dispatch(9);
      cb();
      subject.dispatch(10);
      cb();
    }

    if (n === 11) {
      subject.dispatch(12);
      cb();
      subject.dispatch(14);
      cb();
      subject.dispatch(19);
      cb();
    }

    if (n === 12) {
      subject.dispatch(13);
      cb();
    }

    if (n === 14) {
      subject.dispatch(15);
      cb();
      subject.dispatch(16);
      cb();
    }

    if (n === 16) {
      subject.dispatch(17);
      cb();
    }

    if (n === 17) {
      subject.dispatch(18);
      cb();
    }
  });

  subject.dispatch(1);
  subject.dispatch(20);

  return unsubscribe;
}

QUnit.test("BufferedSubject", (assert) => {
  let subject = new Subject<number>();
  const originalReceived: number[] = [];
  recordReceived(subject, originalReceived, () => 0);

  let bufferedSubject = new BufferedSubject<number>();
  let received: number[] = [];
  let unsubscribe = recordReceived(bufferedSubject, received, () => 0);
  assert.equal(received.length, 0);

  debugger
  bufferedSubject.flushUntilEmpty();
  assert.deepEqual(received, originalReceived);
  unsubscribe();

  received.length = 0;
  unsubscribe = recordReceived(bufferedSubject, received, () => bufferedSubject.flushNext());
  bufferedSubject.flushUntilEmpty();
  assert.deepEqual(received, originalReceived);
  unsubscribe();

  for (let i = 0; i < 100; ++i) {
    received.length = 0;
    debugger
    unsubscribe = recordReceived(bufferedSubject, received, () => (Math.random() < 0.5 ? bufferedSubject.flushNext() : null));
    bufferedSubject.flushUntilEmpty();
    assert.deepEqual(received, originalReceived);
    unsubscribe();
  }
});

