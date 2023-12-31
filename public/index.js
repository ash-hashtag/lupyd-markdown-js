const parseTextToHtmlElement = (text) => {
  const patternMatches = _parseText(new PatternMatchPart(text), defaultMatchers());
  const p = document.createElement("p");
  p.innerText = patternMatches.toString() + "\n";
  const elem = convertPatternMatchesToHtmlElementsContainers(patternMatches, defaultHTMLContainerConverters());
  elem.insertAdjacentElement("afterbegin", p);
  return elem;
};
const inputTextArea = document.getElementById("input-text");
const outputElement = document.getElementById("output-text");
inputTextArea.addEventListener("input", (_) => {
  const text = inputTextArea.value;
  outputElement.replaceChildren(parseTextToHtmlElement(text));
});
function areListsEqual(a, b) {
  if (a === b)
    return true;
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
const rawBoldRegex = /(?<!\\)\*\*\*(.*?)(?<!\\)\*\*\*/gm;
const rawItalicRegex = /(?<!\\)\/\/\/(.*?)(?<!\\)\/\/\//gm;
const rawUnderlineRegex = /(?<!\\)___(.*?)(?<!\\)___/gm;
const rawHeaderRegex = /(?<!\\)###(.*?)(?<!\\)###/gm;
const rawCodeRegex = /(?<!\\)"""(.*?)(?<!\\)"""/gm;
const rawHashtagRegex = /(?<!\\)#\w+/gm;
const rawMentionRegex = /(?<!\\)@\w+/gm;
const rawQuoteRegex = /^>\|\s.*$/gm;
const rawHyperLinkRegex = /\[(.+)\]\((.+)\)/gm;
class Match {
  start;
  end;
  inputText;
  constructor(start, end, inputText) {
    this.start = start;
    this.end = end;
    this.inputText = inputText;
  }
  result() {
    return this.inputText.substring(this.start, this.end);
  }
}
class PatternMatcher {
  matcher;
  delimiter;
  matchType;
  lookInwards;
  singleType;
  constructor(matcher, delimiter, matchType, lookInwards, singleType) {
    this.matchType = matchType;
    this.matcher = matcher;
    this.delimiter = delimiter;
    this.lookInwards = lookInwards;
    this.singleType = singleType;
  }
  toString() {
    return `PatternMatcher { type: ${this.matchType} }`;
  }
}
class RegexPatternMatcher extends PatternMatcher {
  regex;
  constructor(regex, matchType, delimiter, lookInwards, singleType) {
    const matcher = (_) => {
      let matchArray;
      let matches = [];
      regex.lastIndex = 0;
      while ((matchArray = regex.exec(_)) !== null) {
        const match = new Match(matchArray.index, matchArray.index + matchArray[0].length, _);
        matches.push(match);
      }
      return matches;
    };
    super(matcher, delimiter, matchType, lookInwards, singleType);
    this.regex = regex;
  }
}
const tripleDelimiterBoth = (_) => _.substring(3, _.length - 3);
const singleDelimiter = (_) => _.substring(1);
const noDelimiter = (_) => _;
function defaultMatchers() {
  const boldMatcher = new RegexPatternMatcher(rawBoldRegex, "bold", tripleDelimiterBoth, true, false);
  const headerMatcher = new RegexPatternMatcher(rawHeaderRegex, "header", tripleDelimiterBoth, true, false);
  const codeMatcher = new RegexPatternMatcher(rawCodeRegex, "code", tripleDelimiterBoth, true, false);
  const italicMatcher = new RegexPatternMatcher(rawItalicRegex, "italic", tripleDelimiterBoth, true, false);
  const underlineMatcher = new RegexPatternMatcher(rawUnderlineRegex, "underline", tripleDelimiterBoth, true, false);
  const hashtagMatcher = new RegexPatternMatcher(rawHashtagRegex, "hashtag", singleDelimiter, false, true);
  const usernameMatcher = new RegexPatternMatcher(rawMentionRegex, "username", singleDelimiter, false, true);
  const hyperLinkMatcher = new RegexPatternMatcher(rawHyperLinkRegex, "hyperlink", noDelimiter, false, true);
  const quoteMatcher = new RegexPatternMatcher(rawQuoteRegex, "quote", tripleDelimiterBoth, true, true);
  return [
    boldMatcher,
    headerMatcher,
    hashtagMatcher,
    italicMatcher,
    usernameMatcher,
    hyperLinkMatcher,
    quoteMatcher,
    underlineMatcher,
    codeMatcher
  ];
}
class PatternMatchPart {
  text;
  matchTypes;
  constructor(text, matchTypes = []) {
    this.text = text;
    this.matchTypes = matchTypes;
  }
  toString() {
    return `{ text: ${this.text}, type: ${this.matchTypes} }`;
  }
  isEqual(other) {
    if (other === this) {
      return true;
    }
    return other.text === this.text && areListsEqual(other.matchTypes, this.matchTypes);
  }
}
function _parseText(inputPart, patternMatchers) {
  const inputText = inputPart.text;
  const parts = [];
  if (patternMatchers.length === 0) {
    return [inputPart];
  }
  const patternMatches = [];
  for (const patternMatcher of patternMatchers) {
    patternMatches.push(...patternMatcher.matcher(inputText).map((e) => ({ a: e, b: patternMatcher })));
  }
  patternMatches.sort((a, b) => a.a.start - b.a.start);
  let current = 0;
  let currentTypes = [...inputPart.matchTypes];
  for (const match of patternMatches) {
    if (current > match.a.start) {
      continue;
    }
    if (current < match.a.start) {
      const part2 = new PatternMatchPart(inputText.substring(current, match.a.start), currentTypes);
      const result = _parseText(part2, patternMatchers);
      parts.push(...result);
    }
    const matchTypes = match.b.singleType ? [match.b.matchType] : [...currentTypes, match.b.matchType];
    const part = new PatternMatchPart(match.b.delimiter(inputText.substring(match.a.start, match.a.end)), matchTypes);
    if (match.b.lookInwards) {
      const result = _parseText(part, patternMatchers);
      parts.push(...result);
    } else {
      parts.push(part);
    }
    current = match.a.end;
  }
  if (current < inputText.length) {
    const input = inputText.substring(current);
    const part = new PatternMatchPart(input, currentTypes);
    parts.push(part);
  }
  return parts;
}
class PatternToHtmlElementConverter {
  matchType;
  converter;
  constructor(matchType, converter) {
    this.matchType = matchType;
    this.converter = converter;
  }
}
class PatternToHtmlContainer {
  matchType;
  converter;
  constructor(matchType, converter) {
    this.matchType = matchType;
    this.converter = converter;
  }
  wrap(_) {
    const container = this.converter();
    if (typeof _ === "string") {
      container.innerText = _;
    } else {
      container.appendChild(_);
    }
    return container;
  }
}
function defaultHTMLConverters() {
  const boldConverter = new PatternToHtmlElementConverter("bold", (_) => {
    const b = document.createElement("b");
    b.innerText = _;
    return b;
  });
  const quoteConverter = new PatternToHtmlElementConverter("bold", (_) => {
    const b = document.createElement("b");
    b.innerText = _;
    b.style.color = "pink";
    return b;
  });
  const hyperLinkConverter = new PatternToHtmlElementConverter("hyperlink", (_) => {
    const div = document.createElement("div");
    div.innerText = _;
    div.style.color = "blue";
    div.style.display = "inline";
    return div;
  });
  const codeConverter = new PatternToHtmlElementConverter("code", (_) => {
    const div = document.createElement("div");
    div.innerText = _;
    div.style.fontFamily = "'Courier New', monospace";
    return div;
  });
  const usernameConverter = new PatternToHtmlElementConverter("username", (_) => {
    const b = document.createElement("b");
    b.innerText = _;
    b.style.color = "grey";
    return b;
  });
  const headerConverter = new PatternToHtmlElementConverter("header", (_) => {
    const header = document.createElement("h1");
    header.style.display = "inline";
    header.innerText = _;
    return header;
  });
  const underlineConverter = new PatternToHtmlElementConverter("underline", (_) => {
    const u = document.createElement("u");
    u.innerText = _;
    return u;
  });
  const hashtagConverter = new PatternToHtmlElementConverter("hashtag", (_) => {
    const hashtag = document.createElement("b");
    hashtag.style.color = "blue";
    hashtag.innerText = _;
    return hashtag;
  });
  const italicConverter = new PatternToHtmlElementConverter("italic", (_) => {
    const italic = document.createElement("span");
    italic.style.fontStyle = "italic";
    italic.innerText = _;
    return italic;
  });
  return [boldConverter, headerConverter, hashtagConverter, italicConverter, hyperLinkConverter, codeConverter, usernameConverter, quoteConverter, underlineConverter];
}
function defaultHTMLContainerConverters() {
  const underlineConverter = new PatternToHtmlContainer("underline", () => {
    const u = document.createElement("u");
    return u;
  });
  const quoteConverter = new PatternToHtmlContainer("bold", () => {
    const b = document.createElement("b");
    b.style.color = "pink";
    return b;
  });
  const hyperLinkConverter = new PatternToHtmlContainer("hyperlink", () => {
    return new HyperLinkElement();
  });
  const codeConverter = new PatternToHtmlContainer("code", () => {
    const div = document.createElement("div");
    div.style.fontFamily = "'Courier New', monospace";
    return div;
  });
  const boldConverter = new PatternToHtmlContainer("bold", () => {
    const b = document.createElement("b");
    return b;
  });
  const headerConverter = new PatternToHtmlContainer("header", () => {
    const header = document.createElement("h1");
    header.style.display = "inline";
    return header;
  });
  const hashtagConverter = new PatternToHtmlContainer("hashtag", () => {
    const hashtag = document.createElement("b");
    hashtag.style.color = "blue";
    return hashtag;
  });
  const italicConverter = new PatternToHtmlContainer("italic", () => {
    const italic = document.createElement("span");
    italic.style.fontStyle = "italic";
    return italic;
  });
  const usernameConverter = new PatternToHtmlContainer("username", () => {
    const a = document.createElement("a");
    a.href = "#";
    a.addEventListener("click", (_) => {
      _.preventDefault();
    });
    return a;
  });
  return [boldConverter, headerConverter, hashtagConverter, italicConverter, usernameConverter, codeConverter, hyperLinkConverter, quoteConverter, underlineConverter];
}
function convertPatternMatchesToHtmlElements(matches, converters) {
  const div = document.createElement("div");
  for (const match of matches) {
    if (match.matchTypes.length === 0) {
      const p = document.createElement("span");
      p.innerText = match.text;
      div.appendChild(p);
    } else {
      for (const matchType of match.matchTypes) {
        const converter = converters.find((_) => _.matchType === matchType);
        if (converter) {
          div.appendChild(converter.converter(match.text));
        } else {
          const p = document.createElement("span");
          p.innerText = match.text;
          div.appendChild(p);
        }
      }
    }
  }
  return div;
}
function convertPatternMatchesToHtmlElementsContainers(matches, converters) {
  const div = document.createElement("div");
  for (const match of matches) {
    if (match.matchTypes.length === 0) {
      const p = document.createElement("span");
      p.innerText = match.text;
      div.appendChild(p);
    } else {
      let innerChild;
      const reversedMatchTypes = match.matchTypes.reverse();
      for (const matchType of reversedMatchTypes) {
        const converter = converters.find((_) => _.matchType === matchType);
        if (converter) {
          innerChild = converter.wrap(innerChild ?? match.text);
        } else {
          const p = document.createElement("span");
          if (innerChild) {
            p.appendChild(innerChild);
          } else {
            p.innerText = match.text;
          }
          innerChild = p;
        }
      }
      if (innerChild) {
        div.appendChild(innerChild);
      }
    }
  }
  return div;
}
class HyperLinkElement extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.render();
  }
  render() {
    const innerText = this.innerText;
    if (innerText.length !== 0) {
      let matchArray;
      while ((matchArray = rawHyperLinkRegex.exec(innerText)) !== null) {
        if (matchArray.length === 3) {
          const url = matchArray[2];
          const tag = matchArray[1];
          let child;
          switch (tag) {
            case "image":
              const img = document.createElement("img");
              img.src = url;
              img.alt = tag;
              child = img;
              break;
            case "video":
              const vid = document.createElement("video");
              vid.controls = true;
              vid.src = url;
              child = vid;
              break;
            default:
              const a = document.createElement("a");
              a.innerText = tag;
              a.href = url;
              child = a;
          }
          this.replaceChildren(child);
        }
      }
    }
  }
}
customElements.define("hyper-link", HyperLinkElement);
