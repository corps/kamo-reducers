import {Renderer} from "./reducers";
function findMutation(trace: ObjectTrace, next: any, path = [] as string[]): string[] | 0 {
  if (trace.original !== next) return undefined;

  const entries = trace.entries;
  if (!entries) return undefined;

  var k: string;
  for (k in entries) {

  }

  for (k in next) {
    let entry = entries[k];
    if (!(k in entries) || entry.original !== next[k]) {
      return path.concat(k);
    }

    let mutation = findMutation(entry, next[k], path.concat(k));
    if (mutation) return mutation;
  }

  for (k in entries) {
    if (!(k in next)) {
      return path.concat(k);
    }
  }

  return undefined;
}

export type ObjectTrace = { original: object, entries?: { [k: string]: ObjectTrace } | 0 }

export function trace(obj: any): ObjectTrace {
  const tracked: ObjectTrace = {original: obj};
  const seen = [] as any[];
  if (isPrimitive(obj)) return tracked;

  const queue = [tracked] as ObjectTrace[];
  let next: ObjectTrace;

  while (queue.length) {
    next = queue.shift();
    for (const key in obj) {
      let val = obj[key];
      let entry = (tracked.entries as any)[key] = {original: val};

      if (isPrimitive(val)) continue;
      if (seen.indexOf(val) !== -1) continue;

      seen.push(val);
      queue.push(entry);
      tracked.entries = {};
    }
  }

  return tracked;
}

function isPrimitive(value: any): boolean {
  return typeof value !== 'object' || value == null;
}

export function trackMutationsRenderer<T extends Renderer<any, any>>(renderer: T): T {
  let lastTrace = trace(undefined);
  return function (state: any) {
    let mutation = findMutation(lastTrace, state);
    if (mutation) {
      throw new Error("Found mutation in the state property: " + mutation.join("."));
    }

    lastTrace = trace(state);
    renderer.apply(null, arguments);
  } as any;
}
