# `@codemovie/code-movie-html` - Use HTML as a DSL for [Code.Movie](https://code.movie) animations

Turn DOM (real DOM nodes as well as [jsdom](https://github.com/jsdom/jsdom) fake DOM nodes) elements into frame objects:

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
  const frameElements = document.querySelectorAll(".animation pre.frame", "code");
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

To see the above in action, install this package, run `npm run demo` and go to `http://localhost:3000/demo/index.html`.

## Getting started

Install this library via your favorite package manager:

```shell
npm install @codemovie/code-movie-html
```

You will almost certainly also want to install [`@codemovie/code-movie`](https://www.npmjs.com/package/@codemovie/code-movie) to turn the frames into an animation and [`@codemovie/code-movie-runtime`](https://www.npmjs.com/package/@codemovie/code-movie-runtime) might also be useful. If you want to work server-side or at compile-time, install [jsdom](https://github.com/jsdom/jsdom) as well.

## Function `framesFromDom`

The package exports a single function that you can point to some DOM with an optional selector to target nested elements:

```typescript
function framesFromDom(containerElements: Iterable<Element>, sourceSelector?: string, windowObject?: Window & typeof globalThis): InputFrame[];
```

Takes an **iterable of elements** (things like Arrays, NodeLists and the like) and turns it into an array of input frames compatible with [`@codemovie/code-movie`](https://www.npmjs.com/package/@codemovie/code-movie). If a non-falsy value is provided for `sourceSelector`, the function will take its content from the first matching descendant of each source element; otherwise the source elements themselves serve as sources.

If your program's global object is not the the `window` object, you can pass the window object as a third argument. This is useful for work with non-browser DOM environments like JSON:

```javascript
import { framesFromDom } from "@codemovie/code-movie-html";
import jsdom from "jsdom";

const dom = new jsdom.JSDOM(`<!DOCTYPE html><p>[]</p><p>[42]</p><p>[23, 42]</p>`);
const actual = framesFromDom(
  // List of sources
  dom.window.document.querySelectorAll("p"),
  // Source selector (none; the <p> elements already contain the content)
  "",
  // Reference to JSDOM's window object
  dom.window
);
```

## HTML DSL specifics

The library currently only extracts the text content from elements and their children. More advanced features are on their way.
