type Data = Record<string, string>;

type InputRange = { from: number; to: number; data: Data };

type InputDecoration =
  | { kind: "GUTTER"; data: Data; line: number; text: string }
  | { kind: "LINE"; data: Data; fromLine: number; toLine: number }
  | { kind: "TEXT"; data: Data; from: number; to: number };

type Context = {
  windowObject: Window & typeof globalThis;
  decorationsSelector: string;
};

type Options = Partial<Context>;

type InputFrame = {
  decorations: InputDecoration[];
  ranges: InputRange[];
  code: string;
};

type IntermediateInputFrame = InputFrame & { to: number; toLine: number };

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

function isGutterDecoration(node: Node, context: Context): boolean {
  return (
    node instanceof context.windowObject.HTMLElement &&
    node.matches(context.decorationsSelector) &&
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
): InputDecoration {
  const data = getData(element);
  const kind = getDecorationKind(element);
  if (kind === "GUTTER") {
    return {
      kind,
      data,
      line: fromLine,
      text: element.innerText,
    };
  } else if (kind === "LINE") {
    return {
      kind,
      data,
      fromLine,
      toLine,
    };
  } else {
    return {
      kind,
      data,
      from,
      to,
    };
  }
}

function fromNode(
  node: Node,
  from: number,
  fromLine: number,
  context: Context
): IntermediateInputFrame {
  let to = from;
  let toLine = fromLine;
  let code = "";
  const ranges = [];
  const decorations = [];
  // Measure the current progress through the text, skipping over gutter
  // decorations (as their content does not count as "code")
  if (node.nodeType === context.windowObject.Node.TEXT_NODE) {
    const textContent = node.textContent ?? "";
    code += textContent;
    to += textContent.length;
    const numBreaks = textContent.split("\n").length - 1;
    toLine += numBreaks;
  } else if (node instanceof context.windowObject.HTMLElement) {
    if (!isGutterDecoration(node, context)) {
      for (const childNode of node.childNodes) {
        const childContent = fromNode(childNode, to, toLine, context);
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
  if (node instanceof context.windowObject.HTMLElement) {
    if (node.matches(context.decorationsSelector)) {
      decorations.push(toDecoration(node, from, to, fromLine, toLine));
    } else {
      ranges.push(toRange(node, from, to));
    }
  }
  return { code, to, toLine, ranges, decorations };
}

export function framesFromDom(
  containerElements: Iterable<Element>,
  { windowObject = window, decorationsSelector = "mark" }: Options = {}
): InputFrame[] {
  const context = { windowObject, decorationsSelector };
  const frames = [];
  for (const frameElement of containerElements) {
    let to = 0;
    let toLine = 1;
    let code = "";
    const decorations = [];
    for (const childNode of frameElement.childNodes) {
      const childContent = fromNode(childNode, to, toLine, context);
      to = childContent.to;
      toLine = childContent.toLine;
      code += childContent.code;
      // Ranges are currently not properly supported by the core library
      // ranges.push(...childContent.ranges);
      decorations.push(...childContent.decorations);
    }
    frames.push({ code, ranges: [], decorations });
  }
  return frames;
}
