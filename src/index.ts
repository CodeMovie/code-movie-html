import type { InputRange, InputDecoration } from "@codemovie/code-movie";

type InputFrame = {
  decorations: InputDecoration[];
  ranges: InputRange[];
  code: string;
};

type IntermediateInputFrame = InputFrame & { to: number; toLine: number };

function fail(message: string): never {
  throw new Error(message);
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
  containerElements: Iterable<Element>,
  sourceSelector = ""
): InputFrame[] {
  const frames = [];
  for (const frameElement of containerElements) {
    let to = 0;
    let toLine = 1;
    let code = "";
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
    frames.push({ code, ranges: [], decorations });
  }
  return frames;
}
