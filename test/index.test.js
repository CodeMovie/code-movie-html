import { suite, test } from "node:test";
import assert from "node:assert";
import jsdom from "jsdom";
import { framesFromDom } from "../dist/index.js";

suite("JSDOM", () => {
  test("It works with JSDOM", () => {
    const dom = new jsdom.JSDOM(
      `<!DOCTYPE html><p>[]</p><p>[42]</p><p>[23, 42]</p>`
    );
    const actual = framesFromDom(dom.window.document.querySelectorAll("p"), {
      windowObject: dom.window,
    });
    assert.deepStrictEqual(actual, [
      { code: "[]", ranges: [], decorations: [] },
      { code: "[42]", ranges: [], decorations: [] },
      { code: "[23, 42]", ranges: [], decorations: [] },
    ]);
  });

  test("It processes decorations", () => {
    const dom = new jsdom.JSDOM(
      `<!DOCTYPE html><p>[]</p><p>[<mark class="foo">42</mark>]</p><p>[<mark class="foo">23</mark>, 42]</p>`
    );
    const actual = framesFromDom(dom.window.document.querySelectorAll("p"), {
      windowObject: dom.window,
    });
    assert.deepStrictEqual(actual, [
      {
        code: "[]",
        ranges: [],
        decorations: [],
      },
      {
        code: "[42]",
        ranges: [],
        decorations: [
          {
            kind: "TEXT",
            data: {
              tagName: "mark",
              class: "foo",
            },
            from: 1,
            to: 3,
          },
        ],
      },
      {
        code: "[23, 42]",
        ranges: [],
        decorations: [
          {
            kind: "TEXT",
            data: {
              tagName: "mark",
              class: "foo",
            },
            from: 1,
            to: 3,
          },
        ],
      },
    ]);
  });
});
