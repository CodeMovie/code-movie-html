import {
  attr,
  debounce,
  enhance,
  init,
  literal,
  observe,
  prop,
  reactive,
  string,
  subscribe,
} from "@sirpepe/ornament";
import { fromStringsToScene, toAnimationHTML } from "@codemovie/code-movie";
import "@codemovie/code-movie-runtime";
import { fail } from "@sirpepe/shed/error";

type InputFrame = Required<Parameters<typeof fromStringsToScene>[0][0]>;

type IntermediateInputFrame = Required<
  Parameters<typeof fromStringsToScene>[0][0]
> & { to: number; toLine: number };

type Data = {
  tagName: string;
  attributes: Record<string, string>;
};

type Range = Required<Parameters<typeof fromStringsToScene>[0][0]>["ranges"][0];

function getData(element: Element): Data {
  return {
    tagName: element.tagName.toLowerCase(),
    attributes: Object.fromEntries(
      Array.from(element.attributes, ({ name, value }) => [name, value])
    ),
  };
}

function toRange(element: Element, from: number, to: number): Range {
  return {
    from,
    to,
    data: getData(element),
  };
}

function isGutterDecoration(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    node.tagName === "MARK" &&
    node.classList.contains("gutter")
  );
}

function getDecorationKind(element: Element): "LINE" | "GUTTER" | "TEXT" {
  return element.classList.contains("line")
    ? "LINE"
    : element.classList.contains("gutter")
    ? "GUTTER"
    : "TEXT";
}

function toDecoration(
  element: HTMLElement,
  from: number,
  to: number,
  fromLine: number,
  toLine: number
) {
  const decoration = {
    data: getData(element),
    kind: getDecorationKind(element),
  };
  if (decoration.kind === "GUTTER") {
    return Object.assign(decoration, {
      line: fromLine,
      text: element.innerText,
    });
  } else if (decoration.kind === "LINE") {
    return Object.assign(decoration, {
      fromLine,
      toLine,
    });
  } else {
    return Object.assign(decoration, {
      from,
      to,
    });
  }
}

function fromNode(
  node: Node,
  from: number,
  fromLine: number
): IntermediateInputFrame {
  let to = from;
  let toLine = fromLine;
  let code = "";
  const ranges = [];
  const decorations = [];
  // Measure the current progress through the text, skipping over gutter
  // decorations (as their content does not count as "code")
  if (node.nodeType === Node.TEXT_NODE) {
    const textContent = node.textContent ?? "";
    code += textContent;
    to += textContent.length;
    const numBreaks = textContent.split("\n").length - 1;
    toLine += numBreaks;
  } else if (node instanceof HTMLElement) {
    if (!isGutterDecoration(node)) {
      for (const childNode of node.childNodes) {
        const childContent = fromNode(childNode, to, toLine);
        to = childContent.to;
        toLine = childContent.toLine;
        code += childContent.code;
        ranges.push(...childContent.ranges);
        decorations.push(...childContent.decorations);
      }
    }
  }
  // Create a new range or decoration for non-text nodes. <mark> turns into a
  // decoration, and other element defines a range.
  if (node instanceof HTMLElement) {
    if (node.tagName === "MARK") {
      decorations.push(toDecoration(node, from, to, fromLine, toLine));
    } else {
      ranges.push(toRange(node, from, to));
    }
  }
  return { code, to, toLine, ranges, decorations };
}

export function framesFromDom(
  containerElements: Element[],
  sourceSelector = ""
): InputFrame[] {
  const frames = [];
  for (const frameElement of containerElements) {
    let to = 0;
    let toLine = 1;
    let code = "";
    const ranges: Range = [];
    const decorations = [];
    const sourceElement = sourceSelector
      ? frameElement.querySelector(sourceSelector) ??
        fail(`No element found for selector ${sourceSelector}`)
      : frameElement;
    for (const childNode of sourceElement.childNodes) {
      const childContent = fromNode(childNode, to, toLine);
      to = childContent.to;
      toLine = childContent.toLine;
      code += childContent.code;
      // Ranges are not supported ATM :)
      // ranges.push(...childContent.ranges);
      decorations.push(...childContent.decorations);
    }
    frames.push({ code, ranges, decorations });
  }
  return frames;
}

const CACHE_KEY: unique symbol = Symbol.for("CodeMovieHTML.moduleCache");
const MODULES_KEY: unique symbol = Symbol.for("CodeMovieHTML.moduleLoaders");
const LANGUAGES_KEY: unique symbol = Symbol.for(
  "CodeMovieHTML.languageLoaders"
);

declare global {
  interface Window {
    [CACHE_KEY]: Record<string, () => any>;
    [MODULES_KEY]: Record<string, () => Promise<any>>;
    [LANGUAGES_KEY]: Record<string, () => Promise<any>>;
  }
}

window[CACHE_KEY] ??= {};

window[MODULES_KEY] ??= {
  plaintext: async () =>
    (window[CACHE_KEY].json ??= (
      await import("@codemovie/code-movie/languages/plaintext")
    ).default),
  json: async () =>
    (window[CACHE_KEY].json ??= (
      await import("@codemovie/code-movie/languages/json")
    ).default),
  elixir: async () =>
    (window[CACHE_KEY].elixir ??= (
      await import("@codemovie/code-movie/languages/elixir")
    ).default),
  rust: async () =>
    (window[CACHE_KEY].rust ??= (
      await import("@codemovie/code-movie/languages/rust")
    ).default),
  css: async () =>
    (window[CACHE_KEY].css ??= (
      await import("@codemovie/code-movie/languages/css")
    ).default),
  html: async () =>
    (window[CACHE_KEY].html ??= (
      await import("@codemovie/code-movie/languages/html")
    ).default),
  ecmascript: async () =>
    (window[CACHE_KEY].ecmascript ??= (
      await import("@codemovie/code-movie/languages/ecmascript")
    ).default),
};

window[LANGUAGES_KEY] ??= {
  plaintext: async () => (await window[MODULES_KEY].plaintext())(),
  json: async () => (await window[MODULES_KEY].json())(),
  elixir: async () => (await window[MODULES_KEY].elixir())(),
  rust: async () => (await window[MODULES_KEY].rust())(),
  css: async () => (await window[MODULES_KEY].css())(),
  html: async () => (await window[MODULES_KEY].html())(),
  javascript: async () =>
    (await window[MODULES_KEY].ecmascript())({
      jsx: false,
      ts: false,
    }),
  "javascript-jsx": async () =>
    (await window[MODULES_KEY].ecmascript())({
      jsx: true,
      ts: false,
    }),
  typescript: async () =>
    (await window[MODULES_KEY].ecmascript())({
      jsx: false,
      ts: true,
    }),
  "typescript-jsx": async () =>
    (await window[MODULES_KEY].ecmascript())({
      jsx: true,
      ts: true,
    }),
};

type GetElementType<S extends string> = S extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[S]
  : S extends keyof SVGElementTagNameMap
  ? SVGElementTagNameMap[S]
  : S extends keyof MathMLElementTagNameMap
  ? MathMLElementTagNameMap[S]
  : S extends keyof HTMLElementDeprecatedTagNameMap
  ? HTMLElementDeprecatedTagNameMap[S]
  : Element;

class DOMRef<S extends string = string, E = GetElementType<S>> {
  #root: WeakRef<ShadowRoot>;
  #selector: string;

  constructor(root: ShadowRoot, selector: S) {
    this.#root = new WeakRef(root);
    this.#selector = selector;
  }

  deref(): E {
    const element = this.#root.deref()?.querySelector(this.#selector);
    if (!element) {
      throw new Error(`Can't find element matching selector ${this.#selector}`);
    }
    return element as E;
  }
}

@enhance()
export class CodeMovieHTML extends HTMLElement {
  #internals = this.attachInternals();
  #root = this.attachShadow({ mode: "open" });

  // Permanently adopted by the element's shadow root and updated with the CSS
  // for captions whenever needed.
  #captionsCSS = new CSSStyleSheet();

  // Saves us from doing querySelector in the Shadow DOM
  #runtime = new DOMRef(this.#root, `code-movie-runtime`);
  #captions = new DOMRef(this.#root, `[part="captions"]`);

  constructor() {
    super();
    this.#root.adoptedStyleSheets.push(this.#captionsCSS);
    this.#root.innerHTML = `<style>
  :host { display: inline-block }
  *, ::before, ::after { box-siting: inherit }
  :host(:state(loading)) { filter: blur(0.1em); }
  [part="captions"] > div { display: none }
</style>
<div part="stage">
  <code-movie-runtime part="animation"></code-movie-runtime>
  <div part="controls">
    <slot name="controls">
      <div part="default-controls">
        <button part="default-controls-prev" data-command="controls-prev">
          <span>&lt; Previous step</span>
        </button>
        <button part="default-controls-next" data-command="controls-next">
          <span>Next step &gt;</span>
        </button>
      </div>
    </slot>
  </div>
  <div part="captions"></div>
</div>`;
  }

  @subscribe((el) => el.shadowRoot!, "click")
  #handleControls(evt: MouseEvent) {
    if ((evt.target as HTMLElement).closest(`[data-command="controls-prev"]`)) {
      this.prev();
    } else if (
      (evt.target as HTMLElement).closest(`[data-command="controls-next"]`)
    ) {
      this.next();
    }
  }

  next() {
    this.#runtime.deref().next();
    this.#syncDefaultControls();
  }

  prev() {
    this.#runtime.deref().prev();
    this.#syncDefaultControls();
  }

  goTo(index: number) {
    this.#runtime.deref().current = index;
  }

  #syncDefaultControls() {
    const { current, maxFrame } = this.#runtime.deref();
    const prev = this.#root.querySelector(`[data-command="controls-prev"]`);
    if (prev instanceof HTMLButtonElement) {
      prev.disabled = current === 0;
    }
    const next = this.#root.querySelector(`[data-command="controls-next"]`);
    if (next instanceof HTMLButtonElement) {
      next.disabled = current === maxFrame;
    }
  }

  // Programming language to use for highlighting
  @attr(
    literal({
      values: Object.keys(window[LANGUAGES_KEY]),
      transform: string(),
    })
  )
  accessor language = "plaintext";

  // The currently language instance, ready and loaded
  accessor #currentLanguageInstance = null;

  @init()
  @reactive({ keys: ["language"] })
  #handleLanguageAttributeChange() {
    // Capture the language for this particular attribute change. This will only
    // ever be a valid language and this function will only run when the
    // language has actually changed
    const language = this.language;
    // Block updates triggered by content updates while a new language loads
    this.#internals.states.add("loading");
    window[LANGUAGES_KEY][language]().then((languageInstance) => {
      // check whether the language that was just loaded is still the current
      // language. If it has changed in meantime, do nothing.
      if (language === this.language) {
        this.#currentLanguageInstance = languageInstance;
        this.#internals.states.delete("loading");
        this.#reInitialize();
      }
    });
  }

  // Observe the element's content for changes
  @observe(MutationObserver, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  })
  #handleHTMLChange() {
    this.#htmlSource = this.innerHTML;
  }

  // Go through an accessor for reactivity and equality filtering
  @prop(string())
  accessor #htmlSource = this.innerHTML;

  // Tracks #htmlSource
  @init()
  @reactive({ keys: ["#htmlSource"] })
  @debounce({ fn: debounce.raf() })
  #handleContentChange() {
    // If a language is currently loading, there is nothing for this method to
    // do; #reInitialize() will be called anyway one the load has completed.
    if (this.#internals.states.has("loading")) {
      return;
    }
    this.#reInitialize();
  }

  #reInitialize() {
    const roots = Array.from(this.children).filter(
      (el) => el instanceof HTMLElement && el.tagName === "FIGURE"
    );
    const frames = framesFromDom(roots, "pre");
    const animationHTML = toAnimationHTML(
      fromStringsToScene(frames, {
        language: this.#currentLanguageInstance ?? fail(),
        tabSize: 2,
      })
    );
    const runtime = this.#runtime.deref();
    runtime.keyframes = Object.keys(frames);
    runtime.innerHTML = animationHTML;
    // Due to changed content, the last "current" value in the runtime may or
    // may not be within the range of the new keyframes. If it is, re-setting it
    // to its already set value won't cause the frame class to be set on the
    // actual animation element. To cover all our bases, we re-set the "current"
    // property and also manually set the class on the animation. One of the two
    // steps will be superfluous in all cases, but they don't interfere with
    // each other so who really cares?
    runtime.current = runtime.current || 0;
    runtime.firstElementChild?.classList?.add(`frame${runtime!.current}`);
    // Don't forget to keep the default controls up to date
    this.#syncDefaultControls();
    // Append captions
    let captionsHTML = "";
    let captionsCSS = "";
    for (let i = 0; i < roots.length; i++) {
      captionsHTML +=
        "<div>" +
        (roots[i].querySelector("figcaption")?.innerHTML || "") +
        "</div>";
      captionsCSS += `code-movie-runtime:has(> .frame${i}) ~ [part="captions"] > div:nth-child(${
        i + 1
      }) { display: block }`;
    }
    this.#captionsCSS.replaceSync(captionsCSS);
    this.#captions.deref().innerHTML = captionsHTML;
  }
}
