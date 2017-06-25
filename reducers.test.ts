import {
  GlobalAction, reducerChain, ReductionWithEffect, renderLoop, RenderUpdate, Service,
  SideEffect
} from "./reducers";
import {Subject, Subscription} from "./subject";
QUnit.module("reducers");

QUnit.test("renderLoop", () => {
  let calls = [] as any[];

  function renderer() {
    calls.push(["renderer", [].slice.apply(arguments)])
  }

  let nextReduction: ReductionWithEffect<number> = {state: 1};

  function reducer(state: number, action: GlobalAction): ReductionWithEffect<number> {
    calls.push(["reducer", [].slice.apply(arguments)]);
    return nextReduction;
  }

  function unsubscribe1() {
    calls.push(["unsubscribe1", [].slice.apply(arguments)])
  }

  function unsubscribe2() {
    calls.push(["unsubscribe2", [].slice.apply(arguments)])
  }

  let services = [] as Service[];

  let service1 = (effect$: Subject<SideEffect>) => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        calls.push(["service1", [dispatch, effect$]]);
        dispatch({type: "service1"});
        let subscription = new Subscription();
        subscription.add(unsubscribe1);
        return subscription.unsubscribe;
      }
    }
  };
  services.push(service1);

  let service2 = (effect$: Subject<SideEffect>) => {
    return {
      subscribe: (dispatch: (action: GlobalAction) => void) => {
        calls.push(["service2", [dispatch, effect$]]);
        dispatch({type: "service2"});
        let subscription = new Subscription();
        subscription.add(unsubscribe2);
        return subscription.unsubscribe;
      }
    }
  };
  services.push(service2);

  const rendering = renderLoop(renderer, reducer, services, 0);
  let updates = [] as RenderUpdate<number, GlobalAction>[];

  let unsubscribe = rendering.subscribe(u => updates.push(u));

  QUnit.assert.strictEqual(calls[0][1][1], calls[1][1][1]);
  let serviceDispatchAction = calls[0][1][0];

  QUnit.assert.strictEqual(serviceDispatchAction, calls[1][1][0]);
  QUnit.assert.strictEqual(calls[0][1][1].constructor, Subject);

  (calls[1][1][1] as Subject<SideEffect>).subscribe(effect => {
    calls.push(["innerEffect", [effect]])
  });

  calls[3][1][2]();

  nextReduction = {state: 2, effect: {effectType: "test-effect-1"}};
  serviceDispatchAction({type: "service-dispatch"});

  nextReduction = {state: 3, effect: {effectType: "test-effect-2"}};
  let renderDispatchAction = calls[3][1][1];
  renderDispatchAction({type: "renderer-dispatch"});

  calls[9][1][2]();

  QUnit.assert.deepEqual(updates, [
    ["a", {type: "service2"}],
    ["s", 1],
    ["r"],
    ["c"],
    ["a", {type: "service1"}],
    ["s", 1],
    ["r"],
    ["c"],
    ["a", {type: "@init"}],
    ["s", 1],
    ["r"],
    ["c"],
    ["a", {"type": "service-dispatch"}],
    ["s", 2],
    ["r"],
    ["c"],
    ["a", {"type": "renderer-dispatch"}],
    ["s", 3],
    ["r"],
    ["c"],
    ["e", {"effectType": "test-effect-1"}],
    ["e", {"effectType": "test-effect-2"}],
  ]);

  QUnit.assert.deepEqual(calls[2][1], [0, {type: "service2"}]);
  QUnit.assert.deepEqual(calls[3][1][0], 1);
  QUnit.assert.deepEqual(calls[4][1], [1, {type: "service1"}]);
  QUnit.assert.deepEqual(calls[5][1][0], 1);
  QUnit.assert.deepEqual(calls[6][1], [1, {type: "@init"}]);
  QUnit.assert.deepEqual(calls[7][1][0], 1);
  QUnit.assert.deepEqual(calls[8][1], [1, {type: "service-dispatch"}]);
  QUnit.assert.deepEqual(calls[9][1][0], 2);
  QUnit.assert.deepEqual(calls[10][1], [2, {type: "renderer-dispatch"}]);
  QUnit.assert.deepEqual(calls[11][1][0], 3);
  QUnit.assert.deepEqual(calls[12][1][0], {"effectType": "test-effect-1"});
  QUnit.assert.deepEqual(calls[13][1][0], {"effectType": "test-effect-2"});
  QUnit.assert.equal(calls.length, 14);

  QUnit.assert.deepEqual(calls.map(c => c[0]), [
    "service1",
    "service2",
    "reducer",
    "renderer",
    "reducer",
    "renderer",
    "reducer", // 6
    "renderer", // 7
    "reducer", // 8
    "renderer", // 9
    "reducer", // 10
    "renderer", // 11
    "innerEffect",
    "innerEffect",
  ]);


  calls = [];
  unsubscribe();

  QUnit.assert.deepEqual(calls.map(c => c[0]), [
    "unsubscribe2",
    "unsubscribe1",
  ]);

  calls = [];

  serviceDispatchAction({type: "service-dispatch"});
  renderDispatchAction({type: "renderer-dispatch"});
  QUnit.assert.equal(calls.length, 0);
});

QUnit.test("reducerChain", () => {
  let chain = reducerChain<{ a: number, b: number, c: object }>({
    state: {a: 0, b: 1, c: {}},
    effect: {effectType: "a"}
  }, {type: "1"})
    .apply((state, action) => {
      QUnit.assert.deepEqual(action, {type: "1"});
      state = {...state};
      state.a++;
      return {state, effect: {effectType: "b"}};
    })
    .apply((state, action) => {
      QUnit.assert.deepEqual(action, {type: "1"});
      state = {...state};
      state.b++;
      return {state};
    })
    .applySub("a", (state, action) => {
      QUnit.assert.deepEqual(action, {type: "1"});
      return {state: state + 3, effect: {effectType: "c"}};
    });

  let oldState = chain.state;

  let result = chain.applySub("c", (state, action) => {
    QUnit.assert.deepEqual(action, {type: "1"});
    return {state};
  }).finish();

  QUnit.assert.strictEqual(oldState, result.state);
  QUnit.assert.deepEqual(result,
    {
      "effect": {
        "effectType": "sequenced",
        "effects": [
          {
            "effectType": "a"
          },
          {
            "effectType": "b"
          },
          {
            "effectType": "c"
          }
        ]
      },
      "state": {
        "a": 4,
        "b": 2,
        "c": {}
      }
    });
})