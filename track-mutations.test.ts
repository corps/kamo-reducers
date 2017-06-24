import {trackMutations} from "./track-mutations";
QUnit.module("track-mutations");

function makeTracker() {
  let f = trackMutations((s: any) => {
    return "ok";
  });

  return function (next: any) {
    try {
      return f(next);
    } catch (e) {
      return e.toString();
    }
  }
}

QUnit.test("trackMutations", (assert) => {
  let tracker = makeTracker();

  let state: any = {};
  assert.equal(tracker(undefined), "ok");
  assert.equal(tracker(state), "ok");
  assert.equal(tracker(undefined), "ok");
  assert.equal(tracker(state), "ok");

  state = {...state};
  state.a = {a: [], b: 45, c: {a: [1, 2, 3], b: null, c: {a: 4, b: [false]}}, d: ["asdf", undefined, false]};
  state.b = {a: [], b: 45, c: {a: [1, 2, 3], b: null, c: {a: 4, b: [false]}}, d: ["asdf", undefined, false]};
  state.c = {a: [], b: 45, c: {a: [1, 2, 3], b: null, c: {a: 4, b: [false]}}, d: ["asdf", undefined, false]};
  assert.equal(tracker(state), "ok");

  state = {...state};
  assert.ok(state.c);
  delete state.c;
  assert.equal(tracker(state), "ok");

  state = {...state};
  state.a = {...state.a};
  state.a.b = "asdf";
  assert.equal(tracker(state), "ok");

  state.b.d.push(false);
  assert.equal(tracker(state), "Error: Found mutation in the state property: b.d.3");

  state = {...state};
  state.b = {...state.b};
  state.b.d.pop();
  assert.equal(tracker(state), "Error: Found mutation in the state property: b.d.3");

  state = {...state};
  state.a = {...state.a};
  state.a.c = {...state.a.c};
  state.a.c.a[1] = {};
  assert.equal(tracker(state), "Error: Found mutation in the state property: a.c.a.1");

  state = {...state};
  state.a = {...state.a};
  state.b = {...state.b};
  state.b.c = {...state.b.c};
  state.b.c.a = state.a;
  state.a.c = state.b.c;
  assert.equal(tracker(state), "ok");

  state = {...state};
  state.a = {...state.a};
  state.a.c = {...state.a.c};
  assert.ok(state.a.c.b !== undefined);
  delete state.a.c.b;
  assert.equal(tracker(state), "ok");

  state = {...state};
  state.a = {...state.a};
  assert.ok(state.a.c.a !== undefined);
  delete state.a.c.a;
  assert.equal(tracker(state), "Error: Found mutation in the state property: a.c.a");

  state = {...state};
  state.a = {...state.a};
  state.a.c.f = 1;
  assert.equal(tracker(state), "Error: Found mutation in the state property: a.c.f");
});