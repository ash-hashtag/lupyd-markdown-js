(() => {
  // src/lupydMarkdown.ts
  var rawHyperLinkRegex = /\[(.+)\]\((.+)\)/gm;
  var rawBoldRegex = /(?<!\\)\*\*\*([\s\S]*?)(?<!\\)\*\*\*/gm;
  var rawItalicRegex = /(?<!\\)\/\/\/([\s\S]*?)(?<!\\)\/\/\//gm;
  var rawUnderlineRegex = /(?<!\\)___([\s\S]*?)(?<!\\)___/gm;
  var rawHeaderRegex = /(?<!\\)###([\s\S]*?)(?<!\\)###/gm;
  var rawCodeRegex = /(?<!\\)```([\s\S]*?)(?<!\\)```/gm;
  var rawSpoilerRegex = /(?<!\\)\|\|\|([\s\S]*?)(?<!\\)\|\|\|/gm;
  var rawHashtagRegex = /(?<!\\)#\w+/gm;
  var rawMentionRegex = /(?<!\\)@\w+/gm;
  var rawQuoteRegex = /^>\|\s.*$/gm;
  var rawSvgRegex = /(?<!\\)<svg\s*(?:\s+[^>]+)?>(?:(?!<\/svg>).)*?(?<!\\)<\/svg>/gm;
  var rawWordBoldRegex = /(?<!\\)\*(?!\s)([^\s]+)(?<!\\)\*/gm;
  var rawWordItalicRegex = /(?<!\\)\/(?!\s)([^\s]+)(?<!\\)\//gm;
  var rawWordUnderlineRegex = /(?<!\\)_(?!\s)([^\s]+)(?<!\\)_/gm;
  var rawWordHeaderRegex = /(?<!\\)#(?!\s)([^\s]+)(?<!\\)#/gm;
  var rawWordSpoilerRegex = /(?<!\\)\|(?!\s)([^\s]+)(?<!\\)\|/gm;
  var MAX_ELEMENT_TYPE = 4096 /* Svg */;
  function hasType(type, checkType) {
    return (type & checkType) === checkType;
  }
  function iterateTypes(type) {
    const types = [];
    let checkType = MAX_ELEMENT_TYPE;
    while (checkType) {
      if (hasType(type, checkType)) {
        types.push(checkType);
      }
      checkType = checkType >> 1;
    }
    return types;
  }
  var LupydMarkdown = class extends HTMLElement {
    markdown;
    convertToHtmlElement;
    constructor(markdown, convertToHtmlElement) {
      super();
      this.markdown = markdown;
      this.convertToHtmlElement = convertToHtmlElement;
    }
    connectedCallback() {
      this.render();
    }
    render() {
      this.replaceChildren(...this.markdown.elements.map(this.convertToHtmlElement));
    }
  };
  customElements.define("lupyd-markdown", LupydMarkdown);
  var HyperLinkElement = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    render() {
      const innerText = this.innerHTML.length !== 0 ? this.innerHTML : this.innerText;
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
            this.shadowRoot.replaceChildren(child);
          }
        }
      }
    }
  };
  customElements.define("hyper-link", HyperLinkElement);

  // src/index.ts
  var Match = class {
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
  };
  var PatternMatcher = class {
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
  };
  var RegexPatternMatcher = class extends PatternMatcher {
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
  };
  var tripleDelimiterBoth = (_) => _.substring(3, _.length - 3);
  var singleDelimiter = (_) => _.substring(1);
  var singleDelimiterBoth = (_) => _.substring(1, _.length - 1);
  var noDelimiter = (_) => _;
  function defaultMatchers() {
    const boldMatcher = new RegexPatternMatcher(rawBoldRegex, 1 /* Bold */, tripleDelimiterBoth, true, false);
    const headerMatcher = new RegexPatternMatcher(rawHeaderRegex, 4 /* Header */, tripleDelimiterBoth, true, false);
    const italicMatcher = new RegexPatternMatcher(rawItalicRegex, 2 /* Italic */, tripleDelimiterBoth, true, false);
    const underlineMatcher = new RegexPatternMatcher(rawUnderlineRegex, 8 /* UnderLine */, tripleDelimiterBoth, true, false);
    const boldWordMatcher = new RegexPatternMatcher(rawWordBoldRegex, 1 /* Bold */, singleDelimiterBoth, true, false);
    const headerWordMatcher = new RegexPatternMatcher(rawWordHeaderRegex, 4 /* Header */, singleDelimiterBoth, true, false);
    const italicWordMatcher = new RegexPatternMatcher(rawWordItalicRegex, 2 /* Italic */, singleDelimiterBoth, true, false);
    const underlineWordMatcher = new RegexPatternMatcher(rawWordUnderlineRegex, 8 /* UnderLine */, singleDelimiterBoth, true, false);
    const codeMatcher = new RegexPatternMatcher(rawCodeRegex, 16 /* Code */, tripleDelimiterBoth, true, false);
    const hashtagMatcher = new RegexPatternMatcher(rawHashtagRegex, 512 /* HashTag */, singleDelimiter, false, true);
    const usernameMatcher = new RegexPatternMatcher(rawMentionRegex, 256 /* Mention */, singleDelimiter, false, true);
    const hyperLinkMatcher = new RegexPatternMatcher(rawHyperLinkRegex, 128 /* HyperLink */, noDelimiter, false, true);
    const quoteMatcher = new RegexPatternMatcher(rawQuoteRegex, 32 /* Quote */, noDelimiter, false, true);
    const svgMatcher = new RegexPatternMatcher(rawSvgRegex, 4096 /* Svg */, noDelimiter, false, true);
    const spoilerMatcher = new RegexPatternMatcher(rawSpoilerRegex, 64 /* Spoiler */, tripleDelimiterBoth, true, true);
    const spoilerWordMatcher = new RegexPatternMatcher(rawWordSpoilerRegex, 64 /* Spoiler */, singleDelimiterBoth, true, true);
    return [
      boldMatcher,
      headerMatcher,
      spoilerMatcher,
      hashtagMatcher,
      italicMatcher,
      usernameMatcher,
      hyperLinkMatcher,
      quoteMatcher,
      underlineMatcher,
      codeMatcher,
      svgMatcher,
      boldWordMatcher,
      headerWordMatcher,
      italicWordMatcher,
      underlineWordMatcher,
      spoilerWordMatcher
    ];
  }
  function wrapTag(tagName, child, className) {
    const p = document.createElement(tagName);
    if (typeof child === "string") {
      p.innerText = child;
    } else {
      p.append(child);
    }
    if (className)
      p.classList.add(className);
    return p;
  }
  function convertToHTMLElement(element, wrapToHtmlElement) {
    const type = element.elementType;
    const text = element.text;
    let child = text;
    for (const _type of iterateTypes(type)) {
      child = wrapToHtmlElement(child, _type);
    }
    if (typeof child === "string") {
      return wrapTag("span", child);
    } else {
      return child;
    }
  }
  function defaultWrapToHtmlElement(child, type) {
    switch (type) {
      case 1 /* Bold */:
        return wrapTag("b", child);
      case 0 /* Normal */:
        return wrapTag("span", child);
      case 2 /* Italic */:
        return wrapTag("i", child);
      case 4 /* Header */:
        return wrapTag("h1", child);
      case 8 /* UnderLine */:
        return wrapTag("u", child);
      case 16 /* Code */:
        return wrapTag("tt", child);
      case 32 /* Quote */:
        return wrapTag("b", child, "quote");
      case 64 /* Spoiler */:
        return wrapTag("span", child, "spoiler");
      case 128 /* HyperLink */:
        return wrapTag("hyper-link", child);
      case 256 /* Mention */:
        return wrapTag("b", child, "mention");
      case 512 /* HashTag */:
        return wrapTag("b", child, "hashtag");
      case 1024 /* ImageLink */: {
        const img = document.createElement("img");
        if (typeof child === "string")
          img.src = child;
        return img;
      }
      case 2048 /* VideoLink */: {
        const vid = document.createElement("video");
        if (typeof child === "string") {
          vid.src = child;
        }
        return vid;
      }
      case 4096 /* Svg */: {
        const div = document.createElement("div");
        if (typeof child === "string")
          div.innerHTML = child;
        else
          div.append(child);
        return div.firstElementChild;
      }
    }
  }
  function replaceEveryOtherBackslash(inputString) {
    let outputString = "";
    let i = 0;
    while (i < inputString.length) {
      if (inputString.charAt(i) === "\\" && i + 1 < inputString.length) {
        i += 1;
      }
      outputString += inputString.charAt(i);
      i += 1;
    }
    return outputString;
  }
  function _parseText2(inputPart, patternMatchers) {
    const elements = [];
    const inputText = inputPart.text;
    if (patternMatchers.length === 0) {
      return [inputPart];
    }
    const patternMatches = [];
    for (const patternMatcher of patternMatchers) {
      patternMatches.push(...patternMatcher.matcher(inputText).map((e) => ({ a: e, b: patternMatcher })));
    }
    patternMatches.sort((a, b) => a.a.start - b.a.start);
    let current = 0;
    let currentTypes = inputPart.elementType;
    for (const match of patternMatches) {
      if (current > match.a.start) {
        continue;
      }
      if (current < match.a.start) {
        const el = {
          text: inputText.substring(current, match.a.start),
          elementType: currentTypes
        };
        if (el.text.length !== 0) {
          const result = _parseText2(el, patternMatchers);
          elements.push(...result);
        }
      }
      const matchTypes = match.b.singleType ? match.b.matchType : currentTypes | match.b.matchType;
      const element = {
        text: match.b.delimiter(inputText.substring(match.a.start, match.a.end)),
        elementType: matchTypes
      };
      if (element.text.length !== 0) {
        if (match.b.lookInwards) {
          const result = _parseText2(element, patternMatchers);
          elements.push(...result);
        } else {
          elements.push(element);
        }
      }
      current = match.a.end;
    }
    if (current < inputText.length) {
      let text = inputText.substring(current);
      text = replaceEveryOtherBackslash(text);
      elements.push({
        text,
        elementType: currentTypes
      });
    }
    return elements;
  }
  function parseTextToMarkdown(text) {
    const elements = _parseText2({ text, elementType: 0 /* Normal */ }, defaultMatchers());
    return { elements };
  }
  function parseTextToHtmlElement(text) {
    return new LupydMarkdown(parseTextToMarkdown(text), (el) => convertToHTMLElement(el, defaultWrapToHtmlElement));
  }
  var test = () => {
    const inputTextArea = document.getElementById("input-text");
    const outputElement = document.getElementById("output-text");
    inputTextArea.addEventListener("input", (_) => {
      const text = inputTextArea.value;
      outputElement.replaceChildren(parseTextToHtmlElement(text));
    });
  };
  test();
})();
