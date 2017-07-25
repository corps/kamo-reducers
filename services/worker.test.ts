import {serviceActions} from "../reducers";
import {Subject, Subscription} from "../subject";
import {GlobalAction, SideEffect} from "../reducers";
import {cancelWork, requestWork, withFallbackWorkers, withWorkers, workCanceled, workComplete} from "./workers";

QUnit.module("services/worker");

function testWorkerService(service: typeof withWorkers) {
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

    subscription.add(serviceActions(effect$, [service()]).subscribe(a => {
      actions.push(a);

      if (actions.length >= expectedActions.length) {
        subscription.unsubscribe();
        assert.deepEqual(actions, expectedActions);
        finish();
      }
    }));

    effect$.dispatch(requestWork<number>(["a", "1"], (n) => ((self as any).counter = 10) + n, 5));
    effect$.dispatch(requestWork<number>(["a", "1"], (n) => ((self as any).counter = 7) + n, 12));
    effect$.dispatch(requestWork<number>(["a", "1"], (n) => ((self as any).counter || 0) + n, 3));
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

    subscription.add(serviceActions(effect$, [service()]).subscribe(a => {
      actions.push(a);

      if (actions.length === 2) {
        effect$.dispatch(requestWork<number>(["a", "2"], (n) => n, 2));
      }

      if (actions.length >= expectedActions.length) {
        subscription.unsubscribe();
        assert.deepEqual(actions, expectedActions);
        finish();
      }
    }));

    effect$.dispatch(cancelWork(["a", "2"]));
    effect$.dispatch(requestWork<number>(["a", "1"], (n) => n, 5));
    effect$.dispatch(requestWork<number>(["a", "2"], (n) => n, 4));
    effect$.dispatch(cancelWork(["a", "2"]));
  });

  QUnit.test("adding functions into the environment", (assert) => {
    let effect$ = new Subject<SideEffect>();
    let subscription = new Subscription();
    let actions = [] as GlobalAction[];
    let finish = assert.async();

    const expectedActions = [
      workComplete(["a"], 227),
    ] as GlobalAction[];

    function a(n: number) {
      return 11 + n;
    }

    function b() {
      return a(20) - 4;
    }

    const c = () => {
      return b() + 200;
    };

    subscription.add(serviceActions(effect$, [service({a, b}, {c})]).subscribe(a => {
      actions.push(a);

      if (actions.length >= expectedActions.length) {
        subscription.unsubscribe();
        assert.deepEqual(actions, expectedActions);
        finish();
      }
    }));

    effect$.dispatch(requestWork<number>(["a"], (n) => c(), 5));
  });
}

testWorkerService(withWorkers);
testWorkerService(withFallbackWorkers);
