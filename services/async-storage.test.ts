import {isSideEffect, serviceOutputs} from "../reducers";
import {Subject, Subscription} from "../subject";
import {GlobalAction, SideEffect} from "../reducers";
import {withAsyncStorage} from "./async-storage";
import {cancelLocalLoad, loadLocalData, requestLocalData, storeLocalData} from "./local-storage";
QUnit.module("services/async-storage");

QUnit.test("sequences requests", (assert) => {
  let effect$ = new Subject<SideEffect>();
  let subscription = new Subscription();
  let actions = [] as GlobalAction[];
  let finish = assert.async();
  let keyName1 = Date.now() + "" + Math.random();
  let keyName2 = keyName1 + "2";
  let keyName3 = keyName1 + "3";

  const expectedActions = [
    loadLocalData(keyName1, {a: 1}),
    loadLocalData(keyName2, {b: 1}),
    loadLocalData(keyName3, {c: 1}),
  ] as GlobalAction[];

  subscription.add(serviceOutputs(effect$, [withAsyncStorage]).subscribe(a => {
    if (!isSideEffect(a)) {
      actions.push(a);

      if (actions.length === 1) {
        effect$.dispatch(storeLocalData(keyName3, {v: 1}));
      }

      if (actions.length >= expectedActions.length) {
        subscription.unsubscribe();
        assert.deepEqual(actions, expectedActions);
        finish();
      }
    }
  }));

  effect$.dispatch(storeLocalData(keyName1, {a: 1}));
  effect$.dispatch(storeLocalData(keyName2, {b: 1}));
  effect$.dispatch(storeLocalData(keyName3, {c: 1}));
  effect$.dispatch(requestLocalData(keyName1));
  effect$.dispatch(requestLocalData(keyName2));
  effect$.dispatch(requestLocalData(keyName3));
});

QUnit.test("multiple requests to the same key coalesce to the latest request", (assert) => {
  let effect$ = new Subject<SideEffect>();
  let subscription = new Subscription();
  let actions = [] as GlobalAction[];
  let finish = assert.async();
  let keyName = Date.now() + "" + Math.random();

  const expectedActions = [
    loadLocalData(keyName, {d: 1}),
    loadLocalData(keyName, {e: 1}),
  ] as GlobalAction[];

  subscription.add(serviceOutputs(effect$, [withAsyncStorage]).subscribe(a => {
    if (!isSideEffect(a)) {
      actions.push(a);
      if (actions.length === 1) {
        effect$.dispatch(storeLocalData(keyName, {e: 1}));
        effect$.dispatch(requestLocalData(keyName));
      }

      if (actions.length >= expectedActions.length) {
        subscription.unsubscribe();
        assert.deepEqual(actions, expectedActions);
        finish();
      }
    }
  }));

  effect$.dispatch(requestLocalData(keyName));
  effect$.dispatch(storeLocalData(keyName, {a: 1}));
  effect$.dispatch(storeLocalData(keyName, {b: 1}));
  effect$.dispatch(requestLocalData(keyName));
  effect$.dispatch(storeLocalData(keyName, {c: 1}));
  effect$.dispatch(storeLocalData(keyName, {d: 1}));
  effect$.dispatch(requestLocalData(keyName));
});

QUnit.test("cancel prevents load requests, loads on empty objects returns undefined", (assert) => {
  let effect$ = new Subject<SideEffect>();
  let subscription = new Subscription();
  let actions = [] as GlobalAction[];
  let finish = assert.async();
  let keyName1 = Date.now() + "" + Math.random();
  let keyName2 = keyName1 + "2";

  const expectedActions = [
    loadLocalData(keyName1, undefined),
  ] as GlobalAction[];

  subscription.add(serviceOutputs(effect$, [withAsyncStorage]).subscribe(a => {
    if (!isSideEffect(a)) {
      actions.push(a);

      if (actions.length >= expectedActions.length) {
        subscription.unsubscribe();
        assert.deepEqual(actions, expectedActions);
        finish();
      }
    }
  }));

  effect$.dispatch(cancelLocalLoad(keyName1));
  effect$.dispatch(requestLocalData(keyName2));
  effect$.dispatch(cancelLocalLoad(keyName2));
  effect$.dispatch(requestLocalData(keyName1));
});
