import {Subject, Subscription} from "../subject";
import {GlobalAction, IgnoredSideEffect, SideEffect} from "../reducers";

export interface RequestWork {
  effectType: "request-work"
  workF: string,
  argument: any,
  name: string[]
}

export interface CancelWork {
  effectType: "cancel-work"
  name: string[]
}

export interface WorkComplete {
  type: "work-complete"
  result: any
  name: string[]
}

export interface WorkCanceled {
  type: "work-canceled",
  name: string[]
}

export function requestWork<A>(name: string[], f: (a: A) => any, argument: A): RequestWork {
  return {
    effectType: "request-work",
    name, argument,
    workF: asUnnamedFunction(f),
  }
}

export function cancelWork(name: string[]): CancelWork {
  return {
    effectType: "cancel-work",
    name
  }
}

export function workCanceled(name: string[]): WorkCanceled {
  return {
    type: "work-canceled",
    name
  }
}

export function workComplete(name: string[], result: any): WorkComplete {
  return {
    type: "work-complete",
    name, result
  }
}

interface FakeWorkerContext {
  onmessage: (e: { data: any }) => void
  postMessage: (result: any) => void
}

function fakeSelf(): FakeWorkerContext {
  return {
    onmessage: null,
    postMessage: null
  }
}

var lastSelfId = 0;
var selfs = {} as {[k: string]: FakeWorkerContext};

export function withFallbackWorkers(...namespaces: { [k: string]: Function }[]) {
  let prelude = "";

  for (let namespace of namespaces) {
    for (let k in namespace) {
      let value = namespace[k];
      prelude += "var " + k + " = " + asUnnamedFunction(value) + "; ";
    }
  }

  prelude += "var self = selfs[" + (++lastSelfId) + "]; ";
  let self = selfs[lastSelfId] = fakeSelf();
  let workerScript = prelude + functionContents(worker);

  return (effect$: Subject<SideEffect>) => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        let subscription = new Subscription();
        let handles = {} as { [k: string]: number };

        let shutdown = false;

        subscription.add(() => {
          shutdown = true;

          for (let k in handles) {
            let handle = handles[k];
            if (handle != null) {
              clearTimeout(handle);
            }
          }
        });

        subscription.add(effect$.subscribe((effect: RequestWork | CancelWork | IgnoredSideEffect) => {
          let normalizedName: string;

          switch (effect.effectType) {
            case "request-work":
              normalizedName = effect.name.join("-");
              var handle = handles[normalizedName];
              if (handle != null) {
                clearTimeout(handle);
                handles[normalizedName] = null;
                dispatch(workCanceled(effect.name))
              }

              if (shutdown) break;

              handles[normalizedName] = setTimeout(() => {
                handles[normalizedName] = null;

                eval(selfExecutingContents(workerScript));
                self.postMessage = (result: any) => {
                  dispatch(workComplete(effect.name, result));
                };

                self.onmessage({data: [effect.workF, effect.argument]});
              }, 20);
              break;

            case "cancel-work":
              normalizedName = effect.name.join("-");
              var handle = handles[normalizedName];
              if (handle != null) {
                clearTimeout(handle);
                handles[normalizedName] = null;
                dispatch(workCanceled(effect.name))
              }
              break;
          }
        }));

        return subscription.unsubscribe;
      }
    }
  }
}

export function withWorkers(...namespaces: { [k: string]: Function }[]) {
  let prelude = "";

  for (let namespace of namespaces) {
    for (let k in namespace) {
      let value = namespace[k];
      prelude += "var " + k + " = " + asUnnamedFunction(value) + "; ";
    }
  }

  let workerScript = prelude + functionContents(worker);

  let blob = new Blob([workerScript], {type: "text/javascript"});
  let url = window.URL.createObjectURL(blob);

  return (effect$: Subject<SideEffect>) => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        let subscription = new Subscription();
        let workers = {} as { [k: string]: Worker | 0 };

        let shutdown = false;

        subscription.add(() => {
          shutdown = true;

          for (let k in workers) {
            let worker = workers[k];
            if (worker) {
              worker.terminate();
            }
          }
        });

        subscription.add(effect$.subscribe((effect: RequestWork | CancelWork | IgnoredSideEffect) => {
          let normalizedName: string;

          switch (effect.effectType) {
            case "request-work":
              normalizedName = effect.name.join("-");
              var worker = workers[normalizedName];
              if (worker) {
                worker.terminate();
                workers[normalizedName] = null;
                dispatch(workCanceled(effect.name))
              }

              if (shutdown) break;

              worker = workers[normalizedName] = new Worker(url);
              worker.onerror = (e) => {
                console.error(e.message);
              };

              worker.onmessage = (e) => {
                let worker = workers[normalizedName];
                if (worker) worker.terminate();
                workers[normalizedName] = null;
                dispatch(workComplete(effect.name, e.data));
              };

              worker.postMessage([effect.workF, effect.argument])
              break;

            case "cancel-work":
              normalizedName = effect.name.join("-");
              var worker = workers[normalizedName];
              if (worker) {
                worker.terminate();
                workers[normalizedName] = null;
                dispatch(workCanceled(effect.name))
              }
              break;
          }
        }));

        return subscription.unsubscribe;
      }
    }
  }
}

function worker() {
  self.onmessage = (e) => {
    let [fStr, args] = e.data;

    let f = eval(fStr);
    (self.postMessage as any)(f(args));
  }
}

export function functionContents(f: Function) {
  let result = f.toString();
  return result.slice(result.indexOf("{") + 1, result.length - 1).trim();
}

function asUnnamedFunction(f: Function) {
  let result = f.toString();
  return "(function " + result.slice(result.indexOf("(")) + ")";
}

function selfExecutingContents(contents: string) {
  return "(function() { " + contents + "})()";
}