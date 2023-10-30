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
const matcher = (s) => {
  return [];
};
class PatternMatcher {
  matcher;
  delimiter;
  matchType;
  lookInwards;
  singleType;
  constructor(matcher2, delimiter, matchType, lookInwards, singleType) {
    this.matchType = matchType;
    this.matcher = matcher2;
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
    const matcher2 = (_) => {
      let matchArray;
      let matches = [];
      regex.lastIndex = 0;
      while ((matchArray = regex.exec(_)) !== null) {
        const match = new Match(matchArray.index, matchArray.index + matchArray[0].length, _);
        matches.push(match);
      }
      return matches;
    };
    super(matcher2, delimiter, matchType, lookInwards, singleType);
    this.regex = regex;
  }
}
const tripleDelimiterBoth = (_) => _.substring(3, _.length - 3);
const singleDelimiter = (_) => _.substring(1);
function defaultMatchers() {
  const boldMatcher = new RegexPatternMatcher(rawBoldRegex, "bold", tripleDelimiterBoth, true, false);
  const headerMatcher = new RegexPatternMatcher(rawHeaderRegex, "header", tripleDelimiterBoth, true, false);
  const italicMatcher = new RegexPatternMatcher(rawItalicRegex, "italic", tripleDelimiterBoth, true, false);
  const hashtagMatcher = new RegexPatternMatcher(rawHashtagRegex, "hashtag", singleDelimiter, false, true);
  const usernameMatcher = new RegexPatternMatcher(rawMentionRegex, "username", singleDelimiter, false, true);
  return [
    boldMatcher,
    headerMatcher,
    hashtagMatcher,
    italicMatcher,
    usernameMatcher
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
  const headerConverter = new PatternToHtmlElementConverter("header", (_) => {
    const header = document.createElement("h1");
    header.style.display = "inline";
    header.innerText = _;
    return header;
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
  return [boldConverter, headerConverter, hashtagConverter, italicConverter];
}
function defaultHTMLContainerConverters() {
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
      console.log(`Lets go to user page: `, a.innerText);
      _.preventDefault();
    });
    return a;
  });
  return [boldConverter, headerConverter, hashtagConverter, italicConverter, usernameConverter];
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
      if (innerChild)
        div.appendChild(innerChild);
    }
  }
  return div;
}
