export interface IArr<T> {
  [i: number]: T, length: number
}

export type ObjectChangeTracker<T> = (t: T) => boolean

export function arrayContentsTracker<T>(tracked = undefined as IArr<T>) {
  return (arr: IArr<T>) => {
    if (tracked === arr) return false;

    try {
      if (tracked == null || arr == null) return true;

      if (tracked.length !== arr.length) {
        return true;
      }

      for (let i = 0; i < tracked.length; ++i) {
        if (tracked[i] !== arr[i]) {
          return true;
        }
      }

      return false;
    } finally {
      tracked = arr;
    }
  }
}

export function instanceTracker<T>(last = undefined as T): ObjectChangeTracker<T> {
  return (obj: T) => {
    if (obj === last) return false;
    last = obj;
    return true;
  }
}

export function objectContentsTracker<T extends Object>(tracked = undefined as T): ObjectChangeTracker<T> {
  return (obj: T) => {
    if (tracked === obj) return false;

    try {
      if (tracked == null || obj == null) return true;

      for (var k in tracked) {
        if (tracked[k] !== obj[k]) return true;
      }

      for (k in obj) {
        if (tracked[k] !== obj[k]) return true;
      }

      return false;
    } finally {
      tracked = obj;
    }
  }
}

export type PropertyTrackers<O> = {[P in keyof O]: ObjectChangeTracker<O[P]>};

export function nestedTrackersObjectTracker<T extends Object>(trackers: PropertyTrackers<T>, tracked = undefined as T) {
  let nestedTrackers = [] as [ObjectChangeTracker<T[keyof T]>, keyof T][];
  let attributeTrackers = [] as (keyof T)[]

  for (let k in trackers) {
    if (trackers[k]) {
      nestedTrackers.push([trackers[k], k]);
    } else {
      attributeTrackers.push(k);
    }
  }

  return (obj: T) => {
    if (tracked === obj) return false;

    try {
      // Ensure all nested trackers receive the latest value.
      let nestedTrackerResult = false;
      nestedTrackers.forEach(([tracker, k]) => {
        if (tracker(obj ? obj[k] : undefined)) nestedTrackerResult = true;
      });

      if (nestedTrackerResult) return true;

      if (tracked == null || obj == null) {
        return true
      }

      for (let k of attributeTrackers) {
        if (tracked[k] !== obj[k]) {
          return true;
        }
      }

      return false;
    } finally {
      tracked = obj;
    }
  }
}

function propertyTrackersFor<T>(t: T): PropertyTrackers<T> {
  let result: PropertyTrackers<T> = {} as any;
  for (let k in t) {
    let v = t[k];
    if (!Array.isArray(v) && typeof v == "object") {
      let empty = true;
      for (let _ in v) {
        empty = false;
        break;
      }

      if (empty) {
        result[k] = instanceTracker<any>();
      } else {
        result[k] = nestedTrackersObjectTracker<any>(propertyTrackersFor(v));
      }
    } else {
      result[k] = null;
    }
  }

  return result;
}

function memoize<T extends Function>(f: T, tracker: (args: IArguments) => boolean): T {
  let called = false;
  let lastValue = undefined as any;

  return function () {
    if (tracker(arguments) || !called) {
      called = true;
      return lastValue = f.apply(this, arguments);
    }

    return lastValue;
  } as any as T;
}

export function memoizeByEachArgument<T extends Function>(t: T): T {
  return memoize(t, arrayContentsTracker<any>());
}

export function memoizeByAllProperties<T extends Function>(t: T): T {
  const objectTracker = objectContentsTracker();
  return memoize(t, args => objectTracker(args[0]));
}

export function memoizeBySomeProperties<A, R>(a: A, f: (a: A) => R): (a: A) => R {
  const objectTracker = nestedTrackersObjectTracker(propertyTrackersFor(a));
  return memoize(f, args => objectTracker(args[0]));
}

