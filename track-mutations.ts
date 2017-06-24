function findMutation(trace: ObjectTrace, next: any,
                      path = [] as string[]): string[] | 0 {
  let sameAsTrace = trace.original === next;
  const entries = trace.entries;
  if (!entries) {
    return undefined;
  }

  var k: string;
  for (k in next) {
    let entry = entries[k];
    if (!entry) {
      if (sameAsTrace) return path.concat([k]);
      continue;
    }

    if (sameAsTrace && entry.original !== next[k]) {
      return path.concat([k]);
    }

    let mutation = findMutation(entry, next[k], path.concat([k]));
    if (mutation) return mutation;
  }

  if (sameAsTrace) {
    for (k in entries) {
      if (!(k in next)) {
        return path.concat([k]);
      }
    }
  }

  return undefined;
}

export type ObjectTrace = { original: any, entries?: { [k: string]: ObjectTrace } | 0 }

function trace(obj: any): ObjectTrace {
  let tracked: ObjectTrace = {original: obj};
  const seen = [] as any[];
  if (isPrimitive(obj)) return tracked;

  const queue = [tracked] as ObjectTrace[];

  while (queue.length) {
    let next = queue.shift();
    next.entries = {};

    for (let key in next.original) {
      let val = next.original[key];
      let entry = (next.entries as any)[key] = {original: val};

      if (isPrimitive(val)) continue;
      if (seen.indexOf(val) !== -1) continue;

      seen.push(val);
      queue.push(entry);
    }
  }

  return tracked;
}

function isPrimitive(value: any): boolean {
  return typeof value !== 'object' || value == null;
}

export function trackMutations<T extends Function>(f: T): T {
  let lastTrace = trace(undefined);
  return function (state: any) {
    let mutation = findMutation(lastTrace, state);
    lastTrace = trace(state);

    if (mutation) {
      throw new Error("Found mutation in the state property: " + mutation.join("."));
    }
    return f.apply(null, arguments);
  } as any;
}
