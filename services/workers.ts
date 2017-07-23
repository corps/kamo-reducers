import {Subject, Subscriber, Subscription} from "../subject";
import {GlobalAction, IgnoredSideEffect, SideEffect} from "../reducers";

export interface RequestWork {
  effectType: "request-work"
  work: string
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

export function requestWork(name: string[], f: Function): RequestWork {
  return {
    effectType: "request-work",
    name,
    work: functionContents(f),
  }
}

export function cancelWork(name: string[]): CancelWork {
  return {
    effectType: "cancel-work",
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
    let subscription = new Subscription();
    let worker = new Worker(url);

    subscription.add(() => {
      worker.terminate();
    });

    subscription.add(effect$.subscribe((effect: RequestWork | CancelWork | IgnoredSideEffect) => {

    }));
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