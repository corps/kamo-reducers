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

export function workCanceled(nane: string[]): WorkCanceled {
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

export function withWorkers(namespace: { [k: string]: Function }) {
  let prelude = "";
  for (let k in namespace) {
    let value = namespace[k];
    prelude += "var " + k + " = " + asUnnamedFunction(value) + "; ";
  }

  let workerScript = prelude + functionContents(worker);
  console.log("script", workerScript);

  let blob = new Blob([workerScript], {type: "text/javascript"});
  let url = window.URL.createObjectURL(blob);

  return (effect$: Subject<SideEffect>) => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        let subscription = new Subscription();
        let workers = {} as { [k: string]: Worker | 0 };

        // let worker = new Worker(url);
        subscription.add(() => {
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

}

export function functionContents(f: Function) {
  let result = f.toString();
  return result.slice(result.indexOf("{") + 1, result.length - 1).trim();
}

export function asUnnamedFunction(f: Function) {
  let result = f.toString();
  return "function " + result.slice(result.indexOf("("))
}