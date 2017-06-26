import {
  instanceTracker, arrayContentsTracker, objectContentsTracker,
  memoizeByEachArgument, memoizeByAllProperties, memoizeBySomeProperties
} from "./memoizers";

QUnit.module("memoizer");

QUnit.test("instanceTracker", () => {
  let tracker = instanceTracker<any>("");
  const newString = new String("");
  const newArray = [] as any[];

  QUnit.assert.equal(tracker(""), false);
  QUnit.assert.equal(tracker(""), false);

  QUnit.assert.equal(tracker(newString), true);
  QUnit.assert.equal(tracker(newString), false);

  QUnit.assert.equal(tracker([]), true);
  QUnit.assert.equal(tracker(newArray), true);
  QUnit.assert.equal(tracker([]), true);
  QUnit.assert.equal(tracker(newArray), true);
  newArray.push(1, 2, 3, 4);
  QUnit.assert.equal(tracker(newArray), false);

  QUnit.assert.equal(tracker(undefined), true);
});

QUnit.test("arrayContentsTracker", () => {
  let tracker = arrayContentsTracker();
  let arr1 = [] as any[];
  let arr2 = [] as any[];
  let args = (function () {
    return arguments;
  })();

  QUnit.assert.equal(tracker(arr1), true);
  QUnit.assert.equal(tracker(arr1), false);
  QUnit.assert.equal(tracker(arr2), false);
  QUnit.assert.equal(tracker(args), false);

  args = (function (a, b) {
    return arguments;
  })(1, 2);

  QUnit.assert.equal(tracker(arr1), false);
  arr1.push(1, 2);
  QUnit.assert.equal(tracker(arr1), false);
  QUnit.assert.equal(tracker(args), false);
  arr2.push(1, 3);

  QUnit.assert.equal(tracker(arr2), true);

  arr1 = [1];
  QUnit.assert.equal(tracker(arr1), true);

  arr1 = [1, 3];
  QUnit.assert.equal(tracker(arr1), true);

  QUnit.assert.equal(tracker(null), true);
});

QUnit.test("objectContentsTracker", () => {
  let tracker = objectContentsTracker();

  let obj = {} as any;

  QUnit.assert.equal(tracker(obj), true);

  QUnit.assert.equal(tracker(null), true);
  QUnit.assert.equal(tracker(null), false);
  QUnit.assert.equal(tracker(undefined), true);

  obj.a = 1;
  obj.b = 2;
  QUnit.assert.equal(tracker(obj), true);
  QUnit.assert.equal(tracker(obj), false);

  QUnit.assert.equal(tracker(obj), false);

  obj = {...obj};
  QUnit.assert.equal(tracker(obj), false);

  obj = {...obj}
  let c = obj.c = [] as any[];

  QUnit.assert.equal(tracker(obj), true);

  c.push(1, 2, 3, 4);
  QUnit.assert.equal(tracker(obj), false);

  obj = {...obj};
  delete obj["a"]
  QUnit.assert.equal(tracker(obj), true);

  obj = {...obj};
  obj.d = 5;
  QUnit.assert.equal(tracker(obj), true);

  obj = {...obj};
  obj.d = 3;
  QUnit.assert.equal(tracker(obj), true);

  obj = {...obj};
  QUnit.assert.equal(tracker(obj), false);

  QUnit.assert.equal(tracker(null), true);
});

QUnit.test("memoizeByEachArgument", () => {
  let lastIdx = 0;
  let f = (a = 0, b = 0, c = 0) => a + b + c + (lastIdx++);

  f = memoizeByEachArgument(f);

  QUnit.assert.equal(f(), 0);
  QUnit.assert.equal(f(2, 3, 4), 10);
  QUnit.assert.equal(f(2, 3, 4), 10);
  QUnit.assert.equal(f(2, 4, 4), 12);
  QUnit.assert.equal(f(2, 4, 0), 9);
  QUnit.assert.equal(f(2, 4), 10);
  QUnit.assert.equal(f(2, new Number(4) as any), 11);
});

QUnit.test("memoizeByAllProperties", () => {
  let lastIdx = 0;
  let f = ({a, b, c} = {a: 0, b: 0, c: 0} as { a?: number, b?: number, c?: number, d?: number }) => {
    return (a || 0) + (b || 0) + (c || 0) + (lastIdx++);
  };

  f = memoizeByAllProperties(f);

  QUnit.assert.equal(f(), 0);
  QUnit.assert.equal(f({a: 2, b: 3, c: 4}), 10);
  QUnit.assert.equal(f({a: 2, b: 3, c: 4}), 10);
  QUnit.assert.equal(f({a: 2, b: 4, c: 4}), 12);
  QUnit.assert.equal(f({a: 2, b: 4, c: 4, d: 9}), 13);
  QUnit.assert.equal(f({a: 2, b: new Number(4) as any}), 10);
  QUnit.assert.equal(f(), 5);
});

QUnit.test("memoizeBySomeProperties", () => {
  const propSchema = {
    a: 1,
    b: 2,
    c: {
      d: 4,
      e: 5,
      z: {}
    },
  };

  let i = 0;
  let f = memoizeBySomeProperties(propSchema, (p: typeof propSchema) => {
    return ++i;
  });

  QUnit.assert.equal(f({a: 1, b: 2, c: {d: 4, e: 5}, g: 0} as any), 1);
  QUnit.assert.equal(f({a: 1, b: 2, c: {d: 4, e: 5, n: 5}, g: 1} as any), 1);
  QUnit.assert.equal(f({a: 1, b: 2, c: {d: 6, e: 5}, g: 2} as any), 2);
  QUnit.assert.equal(f({a: 1, b: 2, c: {d: 6, e: 5, i: 123}, h: 4} as any), 2);

  const mutated = {a: 10, b: 2, c: {d: 6, e: 5, z: {}}, h: 4} as any;
  QUnit.assert.equal(f(mutated), 3);

  mutated.a = 103;
  QUnit.assert.equal(f(mutated), 3);

  let next = {...mutated};
  QUnit.assert.equal(f(next), 3);

  next = {...next};
  next.c = {...next.c};
  next.c.z = {...next.c.z};

  QUnit.assert.equal(f(next), 4);
});
