import {BufferedSubject, delayedValue, Subject, Subscription} from "./subject";
declare var QUnit: any;

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

QUnit.test("BufferedSubject", () => {
  let subject = new BufferedSubject<number>();
  let dispatch = subject.dispatch;
  let subscribe = subject.subscribe;

  let received = [] as number[];
  let unsubscribe = subscribe(v => received.push(v));

  dispatch(1);
  dispatch(2);

  QUnit.assert.deepEqual(received, []);
  received = [];

  subject.flushNext.apply(null);
  QUnit.assert.deepEqual(received, [1]);
  received = [];

  dispatch(3);
  let unsubscribe2 = subscribe(v => v === 5 ? unsubscribe2() : dispatch(v + 10));

  subject.flushCurrent.apply(null);
  QUnit.assert.deepEqual(received, [2, 3]);
  received = [];

  subject.flushCurrent.apply(null);
  QUnit.assert.deepEqual(received, [12, 13]);
  received = [];

  dispatch(1);
  dispatch(3);
  dispatch(5);
  subject.flushUntilEmpty.apply(null);
  QUnit.assert.deepEqual(received, [22, 23, 1, 3, 5, 32, 33, 11, 13]);
  received = [];

  subject.flushUntilEmpty.apply(null);
  QUnit.assert.deepEqual(received, []);
  received = [];

  dispatch(1);
  dispatch(2);

  subject.flushUntilEmpty.apply(null);
  QUnit.assert.deepEqual(received, [1, 2]);
  received = [];

  dispatch(3);
  dispatch(4);
  unsubscribe();
  subject.flushUntilEmpty.apply(null);
  QUnit.assert.deepEqual(received, []);
});

