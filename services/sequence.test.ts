import {BufferedSubject} from "../subject";
import {GlobalAction, SideEffect} from "../reducers";
import {sequence, Sequenced, withSequenced} from "./sequence";
QUnit.module("services/sequence");

QUnit.test("withSequenced", () => {
  let effect$ = new BufferedSubject<SideEffect>();
  let action$ = new BufferedSubject<GlobalAction>();

  let unsubscribe = withSequenced(effect$).subscribe(action$.dispatch);

  let sequenced: Sequenced = {effectType: "sequenced", effects: [{effectType: "a"}, null, {effectType: "b"}]};
  effect$.flush$.dispatch(sequenced);

  QUnit.assert.deepEqual(effect$.queue, [{effectType: "a"}, {effectType: "b"}]);
  effect$.flushUntilEmpty();

  unsubscribe();

  effect$.flush$.dispatch(sequenced);
  QUnit.assert.deepEqual(effect$.queue, []);
});

QUnit.test("sequence", () => {
  let sequenced = sequence({effectType: "a"}, {effectType: "b"});

  QUnit.assert.deepEqual(sequenced, {
    "effectType": "sequenced",
    "effects": [
      {
        "effectType": "a"
      },
      {
        "effectType": "b"
      }
    ]
  });

  QUnit.assert.deepEqual(sequenced = sequence(sequenced, {effectType: "c"}), {
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
      },
    ]
  });

  QUnit.assert.deepEqual(sequenced = sequence(sequenced, null), {
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
      },
    ]
  });

  QUnit.assert.deepEqual(sequenced = sequence(null, sequenced), {
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
      },
    ]
  });
});