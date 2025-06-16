type Data = Record<string, string>;

type InputRange = { from: number; to: number; data: Data };

type InputDecoration =
  | { readonly kind: "GUTTER"; data: Data; line: number; text: string }
  | { readonly kind: "LINE"; data: Data; fromLine: number; toLine: number }
  | { readonly kind: "TEXT"; data: Data; from: number; to: number };

type InputAnnotation = {
  readonly kind: "INLAY";
  data: Data;
  text: string;
  line: number;
  char: number;
};

type Context = {
  windowObject: Window & typeof globalThis;
  decorationsSelector: string;
  annotationsSelector: string;
};

type Options = Partial<Context>;

type InputFrame = {
  decorations: InputDecoration[];
  annotations: InputAnnotation[];
  ranges: InputRange[];
  code: string;
};

type IntermediateInputFrame = InputFrame & {
  toCodePoint: number;
  toGrapheme: number;
  toLine: number;
};

const graphemeSegmenter = new Intl.Segmenter("en-EN", {
  granularity: "grapheme",
});

function countGraphemes(string: string): number {
  return Array.from(graphemeSegmenter.segment(string)).length;
}

function getText(element: Element, context: Context): string {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === context.windowObject.Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === context.windowObject.Node.ELEMENT_NODE) {
      text += getText(node as Element, context);
    }
  }
  return text;
}

function getData(element: Element): Record<string, string> {
  return {
    ...Object.fromEntries(
      Array.from(element.attributes, ({ name, value }) => [name, value])
    ),
    tagName: element.tagName.toLowerCase(),
  };
}

function toRange(element: Element, from: number, to: number): InputRange {
  return {
    from,
    to,
    data: getData(element),
  };
}

function isSkippableExternal(node: Node, context: Context): boolean {
  return (
    node instanceof context.windowObject.HTMLElement &&
    ((node.matches(context.decorationsSelector) &&
      node.classList.contains("gutter")) ||
      (node.matches(context.annotationsSelector) &&
        node.classList.contains("inlay")))
  );
}

function getExternalKind(
  element: Element
): "LINE" | "GUTTER" | "TEXT" | "INLAY" {
  return element.classList.contains("line")
    ? "LINE"
    : element.classList.contains("gutter")
    ? "GUTTER"
    : element.classList.contains("inlay")
    ? "INLAY"
    : "TEXT";
}

function toExternal(
  element: HTMLElement,
  fromCodePoint: number,
  toCodePoint: number,
  fromGrapheme: number,
  fromLine: number,
  toLine: number,
  context: Context
): InputDecoration | InputAnnotation {
  const data = getData(element);
  const kind = getExternalKind(element);
  if (kind === "GUTTER") {
    return {
      kind,
      data,
      line: fromLine,
      text: getText(element, context),
    };
  } else if (kind === "LINE") {
    return {
      kind,
      data,
      fromLine,
      toLine,
    };
  } else if (kind === "INLAY") {
    return {
      kind,
      data,
      text: getText(element, context),
      line: fromLine,
      char: fromGrapheme,
    };
  } else {
    return {
      kind,
      data,
      from: fromCodePoint,
      to: toCodePoint,
    };
  }
}

function fromNode(
  node: Node,
  fromCodePoint: number,
  fromGrapheme: number,
  fromLine: number,
  context: Context
): IntermediateInputFrame {
  let toCodePoint = fromCodePoint;
  let toGrapheme = fromGrapheme;
  let toLine = fromLine;
  let code = "";
  const ranges = [];
  const decorations = [];
  const annotations = [];
  // Measure the current progress through the text, skipping over gutter
  // decorations and annotations (as their content does not count as "code")
  if (node.nodeType === context.windowObject.Node.TEXT_NODE) {
    const textContent = node.textContent ?? "";
    code += textContent;
    toCodePoint += textContent.length;
    toGrapheme += countGraphemes(textContent);
    const numBreaks = textContent.split("\n").length - 1;
    toLine += numBreaks;
  } else if (node instanceof context.windowObject.HTMLElement) {
    if (!isSkippableExternal(node, context)) {
      for (const childNode of node.childNodes) {
        const childContent = fromNode(
          childNode,
          toCodePoint,
          toGrapheme,
          toLine,
          context
        );
        toCodePoint = childContent.toCodePoint;
        toGrapheme = childContent.toGrapheme;
        toLine = childContent.toLine;
        code += childContent.code;
        ranges.push(...childContent.ranges);
        decorations.push(...childContent.decorations);
      }
    }
  }
  // Create a new range or decoration for non-text nodes. <mark> turns into a
  // decoration, and other element defines a range.
  if (node instanceof context.windowObject.HTMLElement) {
    if (
      node.matches(context.decorationsSelector) ||
      node.matches(context.annotationsSelector)
    ) {
      const external = toExternal(
        node,
        fromCodePoint,
        toCodePoint,
        toGrapheme,
        fromLine,
        toLine,
        context
      );
      if (external.kind === "INLAY") {
        annotations.push(external);
      } else {
        decorations.push(external);
      }
    } else {
      ranges.push(toRange(node, fromCodePoint, toCodePoint));
    }
  }
  return {
    code,
    toCodePoint,
    toGrapheme,
    toLine,
    ranges,
    decorations,
    annotations,
  };
}

export function framesFromDom(
  containerElements: Iterable<Element>,
  {
    windowObject = window,
    decorationsSelector = "mark",
    annotationsSelector = "span",
  }: Options = {}
): InputFrame[] {
  const context = { windowObject, decorationsSelector, annotationsSelector };
  const frames = [];
  for (const frameElement of containerElements) {
    let toCodePoint = 0;
    let toGrapheme = 0;
    let toLine = 1;
    let code = "";
    const decorations = [];
    const annotations = [];
    for (const childNode of frameElement.childNodes) {
      const childContent = fromNode(
        childNode,
        toCodePoint,
        toGrapheme,
        toLine,
        context
      );
      toCodePoint = childContent.toCodePoint;
      toGrapheme = childContent.toGrapheme;
      toLine = childContent.toLine;
      code += childContent.code;
      // Ranges are currently not properly supported by the core library
      // ranges.push(...childContent.ranges);
      decorations.push(...childContent.decorations);
      // The annotations feature is currently in stealth mode. Just ignore this,
      // dear reader :)
      annotations.push(...childContent.annotations);
    }
    frames.push({ code, ranges: [], decorations, annotations });
  }
  return frames;
}
