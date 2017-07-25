import {Subject, Subscriber, Subscription} from "../subject";
import {GlobalAction, IgnoredSideEffect, SideEffect} from "../reducers";
import {CancelLocalLoad, loadLocalData, RequestLocalData, StoreLocalData} from "./local-storage";
import {ClearLocalData} from "./local-storage";
import {functionContents} from "./workers";

type LoadedMessage = { key: string, value: any, version: number };
type LoadRequestMessage = { type: "load", key: string, version: number };
type SaveRequestMessage = { type: "save", key: string, value: any };
type ClearRequestMessage = { type: "clear" };
type Request = LoadRequestMessage | SaveRequestMessage | ClearRequestMessage;

export function withAsyncStorage(effect$: Subject<SideEffect>): Subscriber<GlobalAction> {
  let blob = new Blob([functionContents(worker)], {type: "text/javascript"});
  let url = window.URL.createObjectURL(blob);

  return {
    subscribe: (dispatch: (a: GlobalAction) => void) => {
      let subscription = new Subscription();
      let versions = {} as { [k: string]: number };
      let worker = new Worker(url);

      subscription.add(() => {
        worker.terminate();
      });

      subscription.add(effect$.subscribe((effect: StoreLocalData |
        CancelLocalLoad |
        RequestLocalData |
        ClearLocalData |
        IgnoredSideEffect) => {

        switch (effect.effectType) {
          case "clear-local-data":
            worker.postMessage({type: "clear"} as ClearRequestMessage);
            break;

          case "store-local-data":
            worker.postMessage({type: "save", key: effect.key, value: effect.data} as SaveRequestMessage);
            break;

          case "cancel-local-load":
            versions[effect.key] = versions[effect.key] || 0;
            ++versions[effect.key];
            break;

          case "request-local-data":
            versions[effect.key] = versions[effect.key] || 0;
            let version = ++versions[effect.key];
            worker.postMessage({type: "load", key: effect.key, version} as LoadRequestMessage);
            break;
        }
      }));

      worker.onmessage = function (event) {
        let loaded = event.data as LoadedMessage;
        if (versions[loaded.key] !== loaded.version) return;
        dispatch(loadLocalData(loaded.key, loaded.value));
      };

      return subscription.unsubscribe;
    }
  };
}

function worker() {
  let dbReq = indexedDB.open('async-storage', 1);
  let db: IDBDatabase | 0;

  dbReq.onupgradeneeded = (e) => {
    let db = (e.target as any).result as IDBDatabase;
    db.createObjectStore("objects", {keyPath: "key"});
  };

  dbReq.onsuccess = (e) => {
    db = dbReq.result;
    runNext();
  };

  let queue = [] as Request[];

  self.onmessage = function (event) {
    queue.push(event.data);
    if (queue.length === 1) runNext();
  };

  function reply(message: LoadedMessage) {
    (self.postMessage as any)(message);
  }

  function runNext() {
    if (!db) return;
    if (!queue.length) return;

    let next = queue[0];

    switch (next.type) {
      case "clear":
        var tx = db.transaction("objects", "readwrite");
        var req = tx.objectStore("objects").clear();

        req.onerror = (e) => {
          console.error(e);
        };

        tx.oncomplete = finishRun;

        break;

      case "load":
        var tx = db.transaction("objects", "readonly");
        var req = tx.objectStore("objects").get(next.key)
        var {key, version} = next;

        req.onsuccess = (e) => {
          reply({key, version, value: req.result && req.result.value})
        };

        req.onerror = (e) => {
          console.error(e);
          reply({key, version, value: null})
        };

        tx.oncomplete = finishRun;
        break;

      case "save":
        var tx = db.transaction("objects", "readwrite");
        var req = tx.objectStore("objects").put({key: next.key, value: next.value});

        req.onerror = (e) => {
          console.error(e);
        };

        tx.oncomplete = finishRun;
        break;
    }
  }

  function finishRun() {
    queue.shift();
    runNext();
  }
}