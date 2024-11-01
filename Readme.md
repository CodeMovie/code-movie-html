# `@codemovie/code-movie-html` - Use HTML as a DSL for [Code.Movie](https://code.movie) animations

Turn DOM elements into frame objects:

```html
<div class="animation">
<pre class="frame"><code>// How to add two numbers in JS<code></pre>
<pre class="frame"><code>// How to add two numbers in JS
function add() {}</code></pre>
<pre class="frame">// How to add two numbers in JS
function add(a, b) {}</code></pre>
<pre class="frame"><code>// How to add two numbers in JS
function add(a, b) {
  return a + b;
}</code></pre>
<pre class="frame"><code>// How to add two numbers in JS
function add(a, b) {
  return a + b;
}

console.log(add(1, 2)); // > 3</code></pre>
</div>

<script type="module">
  // Turn the contents of <code> elements nested within <pre class="frame">
  // into frame objects. This is what this library is all about.
  import { framesFromDom } from "@codemovie/code-movie-html";
  const frameElements = document.querySelectorAll(".animation pre.frame > code");
  const frames = framesFromDom(frameElements)

  // Use regular @codemovie/code-movie functionality to turn the frames into
  // animation HTML and CSS
  import { animateHTML } from "@codemovie/code-movie";
  import ecmascript from "@codemovie/code-movie/languages/ecmascript";
  const html = animateHTML(frames, { tabSize: 2, language: ecmascript() });

  // Use @code-movie/code-movie-runtime to add a basic UI to the animation and
  import from "@codemovie/code-movie-runtime";
  const runtime = document.createElement("code-movie-runtime");
  runtime.innerHTML = html;
  runtime.controls = true;
  runtime.keyframes = Object.keys(frames);
  document.body.append(runtime);

  // Hide the source elements
  document.querySelector(".animation").hidden = true;
</script>
```

Result:

![An animated code sample in a loop](https://github.com/CodeMovie/code-movie-html/raw/feature/jsdom/demo/demo.gif)

For an interactive example, install this package, run `npm run demo` and open `http://localhost:3000/demo/index.html` in a non-ancient web browser.

## Getting started

Install this library via your favorite package manager:

```shell
npm install @codemovie/code-movie-html
```

You will almost certainly also want to install [`@codemovie/code-movie`](https://www.npmjs.com/package/@codemovie/code-movie) to turn the frames into an animation and [`@codemovie/code-movie-runtime`](https://www.npmjs.com/package/@codemovie/code-movie-runtime) might also be useful. If you want to work server-side or at compile-time, install [jsdom](https://github.com/jsdom/jsdom) as well.

## Function `framesFromDom`

The package exports a single function that you can point to some DOM with additional (optional) options:

```typescript
function framesFromDom(
  containerElements: Iterable<Element>,
  options?: Options
): InputFrame[];
```

The function takes an **iterable of elements** (things like Arrays, NodeLists and the like) and turns it into an array of input frames compatible with [`@codemovie/code-movie`](https://www.npmjs.com/package/@codemovie/code-movie). The options object has the following shape:

```typescript
type Options = {
  windowObject?: Window & typeof globalThis; // defaults to window
  decorationsSelector?: string; // defaults to "mark"
};
```

- **`windowObject`** points to the window object in case your program's global object is not the the `window` object. This is useful for work with non-browser DOM environments like [jsdom](https://github.com/jsdom/jsdom). Defaults to `window`, which works for use in web browsers.
- **`decorationsSelector`** is the selector for decorations (see below). Defaults to the selector `"mark"` to target `<mark>` elements.

The following example shows how the library can be used with jsdom and a custom decorations selector:

```javascript
import { framesFromDom } from "@codemovie/code-movie-html";
import jsdom from "jsdom";

const dom = new jsdom.JSDOM(
  `<!DOCTYPE html><p>[]</p><p>[42]</p><p>[23, 42]</p>`
);
const actual = framesFromDom(
  // List of sources
  dom.window.document.querySelectorAll("p"),
  // Optional options
  {
    // Reference to JSDOM's window object
    windowObject: dom.window,
    // Only target <mark> elements with the class `foo` as decorations
    decorationsSelector: "mark.foo",
  }
);
```

## HTML DSL specifics

The library currently does two things:

1. it extracts the **text content from elements** and their children to serve as the frame's content
2. it turns **`<mark>` elements into decorations**, with different decoration types denoted by the `class` attribute

Even more features are underway and will become available once the core library supports them.

### Text extraction

The library extracts the text contents from its target elements and their descendants. The tags and attributes of target element's descendants are usually ignored:

```html
<div class="target">Hello <b>World</p></div>
```

This markup will result in a frame containing the text `Hello World` with the `<b>` element contributing nothing but its contents.

The only exception to this rule are elements that match the selector passed to the options for `framesFromDom()` (`<mark>` elements by default). These elements get turned into **decorations.**

### Decorations

[Decorations in Code.Movie](http://code.movie/docs/guides/decorations.html) can highlight lines, underline errors or place icons the gutter. Elements
that match the selector passed to the options for `framesFromDom()` (`<mark>` elements by default) processed as decorations according to their class attributes:

| Element's class name contains | Resulting decoration                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `gutter`                      | Gutter decoration for the line the element is in             |
| `line`                        | Line decoration for all lines that the element is part of    |
| None of the above             | Text decoration for the characters within the element's tags |

The `class` attributes can contain other strings, but whether or not they contain `gutter` or `line` determines whether the decoration ends up as a text, line or gutter decoration. The element's tag name and attributes are used to populate the decoration object's `data` fields:

```javascript
// Given <p>[]</p><p>[<mark class="foo">42</mark>]</p><p>[<mark class="foo">23</mark>, 42]</p>
const frames = framesFromDom(document.querySelectorAll("p"));
// Result:
// [
//   {
//     code: "[]",
//     decorations: [],
//   },
//   {
//     code: "[42]",
//     decorations: [
//       {
//         kind: "TEXT",
//         data: {
//           tagName: "mark",
//           class: "foo",
//         },
//         from: 1,
//         to: 3,
//       },
//     ],
//   },
//   {
//     code: "[23, 42]",
//     decorations: [
//       {
//         kind: "TEXT",
//         data: {
//           tagName: "mark",
//           class: "foo",
//         },
//         from: 1,
//         to: 3,
//       },
//     ],
//   },
// ];
```
