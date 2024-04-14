import { Element, ElementType, LupydMarkdown, Markdown, WrapToHtmlElementFunction, iterateTypes, rawBoldRegex, rawCodeRegex, rawHashtagRegex, rawHeaderRegex, rawHyperLinkRegex, rawItalicRegex, rawMentionRegex, rawQuoteRegex, rawSpoilerRegex, rawSvgRegex, rawUnderlineRegex } from "./lupydMarkdown"


// const rawBoldRegex = /(?<!\\)\*\*\*(.*?)(?<!\\)\*\*\*/gm
// const rawItalicRegex = /(?<!\\)\/\/\/(.*?)(?<!\\)\/\/\//gm
// const rawUnderlineRegex = /(?<!\\)___(.*?)(?<!\\)___/gm
// const rawHeaderRegex = /(?<!\\)###(.*?)(?<!\\)###/gm
// const rawCodeRegex = /(?<!\\)```(.*?)(?<!\\)```/gm
// const rawHashtagRegex = /(?<!\\)#\w+/gm
// const rawMentionRegex = /(?<!\\)@\w+/gm
// const rawQuoteRegex = /^>\|\s.*$/gm
// const rawHyperLinkRegex = /\[(.+)\]\((.+)\)/gm

class Match {
  start: number
  end: number
  inputText: string

  constructor(start: number, end: number, inputText: string) {
    this.start = start
    this.end = end
    this.inputText = inputText
  }

  result() { return this.inputText.substring(this.start, this.end) }
}


class PatternMatcher {
  matcher: (_: string) => Match[]
  delimiter: (_: string) => string
  matchType: ElementType
  lookInwards: boolean
  singleType: boolean

  constructor(matcher: (_: string) => Match[], delimiter: (_: string) => string, matchType: ElementType, lookInwards: boolean, singleType: boolean) {
    this.matchType = matchType
    this.matcher = matcher
    this.delimiter = delimiter
    this.lookInwards = lookInwards
    this.singleType = singleType
  }

  toString() { return `PatternMatcher { type: ${this.matchType} }` }
}

class RegexPatternMatcher extends PatternMatcher {
  regex: RegExp

  constructor(regex: RegExp, matchType: ElementType, delimiter: (_: string) => string, lookInwards: boolean, singleType: boolean) {
    const matcher = (_: string) => {
      let matchArray: RegExpExecArray | null
      let matches: Match[] = []
      regex.lastIndex = 0
      while ((matchArray = regex.exec(_)) !== null) {
        const match = new Match(matchArray.index, matchArray.index + matchArray[0].length, _)
        matches.push(match)
      }
      return matches
    }
    super(matcher, delimiter, matchType, lookInwards, singleType)
    this.regex = regex
  }
}
const tripleDelimiterBoth = (_: string) => _.substring(3, _.length - 3);
const singleDelimiter = (_: string) => _.substring(1);
const noDelimiter = (_: string) => _

function defaultMatchers() {
  const boldMatcher = new RegexPatternMatcher(rawBoldRegex, ElementType.Bold, tripleDelimiterBoth, true, false)
  const headerMatcher = new RegexPatternMatcher(rawHeaderRegex, ElementType.Header, tripleDelimiterBoth, true, false)
  const codeMatcher = new RegexPatternMatcher(rawCodeRegex, ElementType.Code, tripleDelimiterBoth, true, false)
  const italicMatcher = new RegexPatternMatcher(rawItalicRegex, ElementType.Italic, tripleDelimiterBoth, true, false)
  const underlineMatcher = new RegexPatternMatcher(rawUnderlineRegex, ElementType.UnderLine, tripleDelimiterBoth, true, false)
  const hashtagMatcher = new RegexPatternMatcher(rawHashtagRegex, ElementType.HashTag, singleDelimiter, false, true)
  const usernameMatcher = new RegexPatternMatcher(rawMentionRegex, ElementType.Mention, singleDelimiter, false, true)
  const hyperLinkMatcher = new RegexPatternMatcher(rawHyperLinkRegex, ElementType.HyperLink, noDelimiter, false, true)
  const quoteMatcher = new RegexPatternMatcher(rawQuoteRegex, ElementType.Quote, tripleDelimiterBoth, true, true)
  const svgMatcher = new RegexPatternMatcher(rawSvgRegex, ElementType.Svg, noDelimiter, false, true)
  const spoilerMatcher = new RegexPatternMatcher(rawSpoilerRegex, ElementType.Spoiler, tripleDelimiterBoth, false, true)
  return [
    boldMatcher, headerMatcher, 
    spoilerMatcher,
    hashtagMatcher, italicMatcher, usernameMatcher, hyperLinkMatcher, quoteMatcher, underlineMatcher,
    codeMatcher,
    svgMatcher,
  ]
}

function wrapTag(tagName: string, child: string | HTMLElement, className?: string) {
  const p = document.createElement(tagName)
  if (typeof child === "string") {
    p.innerText = child
  } else {
    p.append(child)
  }

  if (className)
    p.classList.add(className)

  return p
}

function aTag(href: string) {
  const a = document.createElement("a")
  a.href = href
  return a
}


function convertToHTMLElement(element: Element, wrapToHtmlElement: WrapToHtmlElementFunction): HTMLElement {
  const type = element.elementType
  const text = element.text

  let child: HTMLElement | string = text
  for (const _type of iterateTypes(type)) {
    child = wrapToHtmlElement(child, _type)
  }

  if (typeof child === "string") {
    return wrapTag("span", child)
  } else {
    return child
  }
}

export function defaultWrapToHtmlElement(child: string | HTMLElement, type: ElementType) {
  switch (type) {
    case ElementType.Bold: return wrapTag("b", child)
    case ElementType.Normal: return wrapTag("span", child)
    case ElementType.Italic: return wrapTag("i", child)
    case ElementType.Header: return wrapTag("h1", child)
    case ElementType.UnderLine: return wrapTag("u", child)
    case ElementType.Code: return wrapTag("tt", child)
    case ElementType.Quote: return wrapTag("b", child, "quote")
    case ElementType.Spoiler: return wrapTag("span", child, "spoiler")
    case ElementType.HyperLink: return wrapTag("hyper-link", child)
    case ElementType.Mention: return wrapTag("b", child, "mention")
    case ElementType.HashTag: return wrapTag("b", child, "hashtag")
    case ElementType.ImageLink: {
      const img = document.createElement("img")
      if (typeof child === "string")
        img.src = child
      return img
    }
    case ElementType.VideoLink: {
      const vid = document.createElement("video")
      if (typeof child === "string") {
        vid.src = child
      }
      return vid
    }
    case ElementType.PlaceHolderLink: return aTag(typeof child === "string" ? child : "#")
    case ElementType.Svg: {
      const div = document.createElement("div")
      if (typeof child === "string")
        div.innerHTML = child
      else
        div.append(child)
      return div.firstElementChild as HTMLElement
    }
  }
}


interface Tuple<U, V> {
  a: U,
  b: V
}





function _parseText2(inputPart: Element, patternMatchers: PatternMatcher[]): Element[] {
  const elements: Element[] = []

  const inputText = inputPart.text

  if (patternMatchers.length === 0) {
    return [inputPart]
  }
  const patternMatches: Tuple<Match, PatternMatcher>[] = []
  for (const patternMatcher of patternMatchers) {
    patternMatches.push(...patternMatcher.matcher(inputText).map((e) => ({ a: e, b: patternMatcher })))
  }

  patternMatches.sort((a, b) => a.a.start - b.a.start)

  let current = 0
  let currentTypes = inputPart.elementType

  for (const match of patternMatches) {
    if (current > match.a.start) {
      continue
    }

    if (current < match.a.start) {
      const result = _parseText2({
        text: inputText.substring(current, match.a.start),
        elementType: currentTypes,
      }, patternMatchers)
      elements.push(...result)
    }

    const matchTypes: ElementType = match.b.singleType ? match.b.matchType : currentTypes | match.b.matchType
    const element: Element = {
      text: match.b.delimiter(inputText.substring(match.a.start, match.a.end)),
      elementType: matchTypes,
    }

    if (match.b.lookInwards) {
      const result = _parseText2(element, patternMatchers)
      elements.push(...result)
    } else {
      elements.push(element)
    }

    current = match.a.end
  }

  if (current < inputText.length) {
    const text = inputText.substring(current)
    elements.push({
      text, elementType: currentTypes
    })
  }

  return elements

}


export function parseTextToMarkdown(text: string): Markdown {
  const elements = _parseText2({ text, elementType: ElementType.Normal }, defaultMatchers())
  return { elements }
}


export function parseTextToHtmlElement(text: string): HTMLElement {
  return new LupydMarkdown(parseTextToMarkdown(text), (el) => convertToHTMLElement(el, defaultWrapToHtmlElement))
}


const test = () => {
  const inputTextArea = document.getElementById("input-text")! as HTMLTextAreaElement
  const outputElement = document.getElementById("output-text")! as HTMLElement
  inputTextArea.addEventListener("input", _ => {
    const text = inputTextArea.value
    outputElement.replaceChildren(parseTextToHtmlElement(text))
  })
}


test()
