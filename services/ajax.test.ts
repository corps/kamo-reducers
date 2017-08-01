import {encodeResponseHeaders, parseResponseHeaders} from "./ajax";
QUnit.module("services/ajax");

QUnit.test("parseResponseHeaders / encodeResponseHeaders", (assert) => {
  [{}, {"Head-One": "Some stuff here", "Header-Two": "", Header3: "And more things here"}].forEach((example: any) => {
    let expected = {} as any;
    for (var k in example) {
      expected[k.toLocaleLowerCase()] = example[k];
    }

    assert.deepEqual(parseResponseHeaders(encodeResponseHeaders(example)), expected);
  })
});
