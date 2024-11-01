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

  test("It processes lines that are all decoration", () => {
    const dom = new jsdom.JSDOM(
      `<!DOCTYPE html><p>[\n\n<mark class="line">23,</mark>\n\n<mark class="line">42,</mark>\n\n<mark class="line">1337</mark>\n\n]</p>`
    );
    const actual = framesFromDom(dom.window.document.querySelectorAll("p"), {
      windowObject: dom.window,
    });
    assert.deepStrictEqual(actual, [
      {
        code: "[\n\n23,\n\n42,\n\n1337\n\n]",
        decorations: [
          {
            data: {
              class: "line",
              tagName: "mark",
            },
            fromLine: 3,
            kind: "LINE",
            toLine: 3,
          },
          {
            data: {
              class: "line",
              tagName: "mark",
            },
            fromLine: 5,
            kind: "LINE",
            toLine: 5,
          },
          {
            data: {
              class: "line",
              tagName: "mark",
            },
            fromLine: 7,
            kind: "LINE",
            toLine: 7,
          },
        ],
        ranges: [],
      },
    ]);
  });
});
