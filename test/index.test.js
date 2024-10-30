import test from "node:test";
import assert from "node:assert";
import jsdom from "jsdom";
import { framesFromDom } from "../dist/index.js";

test("JSDOM", (t) => {
  t.test("It works with JSDOM", () => {
    const dom = new jsdom.JSDOM(
      `<!DOCTYPE html><p>[]</p><p>[42]</p><p>[23, 42]</p>`
    );
    const actual = framesFromDom(
      dom.window.document.querySelectorAll("p"),
      "",
      dom.window
    );
    assert.deepStrictEqual(actual, [
      { code: "[]", ranges: [], decorations: [] },
      { code: "[42]", ranges: [], decorations: [] },
      { code: "[23, 42]", ranges: [], decorations: [] },
    ]);
  });
});
