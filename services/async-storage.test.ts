import {serviceActions} from "../reducers";
import {Subject, Subscription} from "../subject";
import {GlobalAction, SideEffect} from "../reducers";
import {withAsyncStorage} from "./async-storage";
import {loadLocalData, requestLocalData, storeLocalData} from "./local-storage";
QUnit.module("services/async-storage");

QUnit.test("sequences requests", (assert) => {
  let effect$ = new Subject<SideEffect>();
  let subscription = new Subscription();
  let actions = [] as GlobalAction[];
  let finish = assert.async();
  let keyName = Date.now() + "" + Math.random();

  const expectedActions = [
    loadLocalData(keyName, null),
    loadLocalData(keyName, {b: 1}),
    loadLocalData(keyName, {d: 1}),
  ] as GlobalAction[];

  subscription.add(serviceActions(effect$, [withAsyncStorage]).subscribe(a => {
    actions.push(a);
    if (actions.length >= expectedActions.length) {
      subscription.unsubscribe();
      assert.deepEqual(actions, expectedActions);
      finish();
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