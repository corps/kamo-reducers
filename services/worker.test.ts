import {serviceActions} from "../reducers";
import {Subject, Subscription} from "../subject";
import {GlobalAction, SideEffect} from "../reducers";
import {cancelWork, requestWork, simpleWorkerFactory, withWorkers, workCanceled, workComplete} from "./workers";

QUnit.module("services/worker");

QUnit.test("multiple consecutive requests coalesce", (assert) => {
  let effect$ = new Subject<SideEffect>();
  let subscription = new Subscription();
  let actions = [] as GlobalAction[];
  let finish = assert.async();

  const expectedActions = [
    workCanceled(["a", "1"]),
    workCanceled(["a", "1"]),
    workComplete(["a", "1"], 3),
  ] as GlobalAction[];

  subscription.add(serviceActions(effect$, [
    withWorkers(simpleWorkerFactory(() => {
      let me = self as any;
      me.counter = me.counter || 0;

      self.onmessage = (e) => {
        (self.postMessage as any)(e.data + (me.counter++));
      }
    }))
  ]).subscribe(a => {
    actions.push(a);

    if (actions.length >= expectedActions.length) {
      subscription.unsubscribe();
      assert.deepEqual(actions, expectedActions);
      finish();
    }
  }));

  effect$.dispatch(requestWork(["a", "1"], 5));
  effect$.dispatch(requestWork(["a", "1"], 12));
  effect$.dispatch(requestWork(["a", "1"], 3));
});

QUnit.test("cancelling jobs", (assert) => {
  let effect$ = new Subject<SideEffect>();
  let subscription = new Subscription();
  let actions = [] as GlobalAction[];
  let finish = assert.async();

  const expectedActions = [
    workCanceled(["a", "2"]),
    workComplete(["a", "1"], 5),
    workComplete(["a", "2"], 2),
  ] as GlobalAction[];

  subscription.add(serviceActions(effect$, [
    withWorkers(simpleWorkerFactory(() => {
      let me = self as any;
      me.counter = me.counter || 0;

      self.onmessage = (e) => {
        (self.postMessage as any)(e.data + (me.counter++));
      }
    }))
  ]).subscribe(a => {
    actions.push(a);

    if (actions.length === 2) {
      effect$.dispatch(requestWork(["a", "2"], 2));
    }

    if (actions.length >= expectedActions.length) {
      subscription.unsubscribe();
      assert.deepEqual(actions, expectedActions);
      finish();
    }
  }));

  effect$.dispatch(cancelWork(["a", "2"]));
  effect$.dispatch(requestWork(["a", "1"], 5));
  effect$.dispatch(requestWork(["a", "2"], 4));
  effect$.dispatch(cancelWork(["a", "2"]));
});
