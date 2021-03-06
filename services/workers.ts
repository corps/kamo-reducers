import {Subject, Subscription} from "../subject";
import {GlobalAction, IgnoredSideEffect, SideEffect} from "../reducers";

export interface RequestWork {
  effectType: "request-work"
  data: any,
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

export function requestWork(name: string[], data: any): RequestWork {
  return {
    effectType: "request-work",
    name, data,
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

export function withWorkers(workerF: () => Worker) {
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

              worker = workers[normalizedName] = workerF();
              worker.onerror = (e) => {
                console.error(e.message);
              };

              worker.onmessage = (e) => {
                let worker = workers[normalizedName];
                if (worker) worker.terminate();
                workers[normalizedName] = null;
                if (!shutdown) dispatch(workComplete(effect.name, e.data));
              };

              worker.postMessage(effect.data)
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

function functionContents(f: Function) {
  let result = f.toString();
  return result.slice(result.indexOf("{") + 1, result.length - 1).trim();
}

export function simpleWorkerFactory(worker: () => void) {
  return () => {
    let blob = new Blob([functionContents(worker)], {"type": "text/javascript"});
    let url = URL.createObjectURL(blob);
    return new Worker(url);
  }
}
