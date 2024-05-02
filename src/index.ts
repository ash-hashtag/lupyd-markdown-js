import { Element, ElementType, LupydMarkdown, Markdown, WrapToHtmlElementFunction, iterateTypes, rawBoldRegex, rawCodeRegex, rawHashtagRegex, rawHeaderRegex, rawHyperLinkRegex, rawItalicRegex, rawMentionRegex, rawQuoteRegex, rawSpoilerRegex, rawSvgRegex, rawUnderlineRegex, rawWordBoldRegex, rawWordHeaderRegex, rawWordItalicRegex, rawWordSpoilerRegex, rawWordUnderlineRegex } from "./lupydMarkdown"

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
const singleDelimiterBoth = (_: string) => _.substring(1, _.length - 1);
const noDelimiter = (_: string) => _

function defaultMatchers() {
  const boldMatcher = new RegexPatternMatcher(rawBoldRegex, ElementType.Bold, tripleDelimiterBoth, true, false)
  const headerMatcher = new RegexPatternMatcher(rawHeaderRegex, ElementType.Header, tripleDelimiterBoth, true, false)
  const italicMatcher = new RegexPatternMatcher(rawItalicRegex, ElementType.Italic, tripleDelimiterBoth, true, false)
  const underlineMatcher = new RegexPatternMatcher(rawUnderlineRegex, ElementType.UnderLine, tripleDelimiterBoth, true, false)
  const boldWordMatcher = new RegexPatternMatcher(rawWordBoldRegex, ElementType.Bold, singleDelimiterBoth, true, false)
  const headerWordMatcher = new RegexPatternMatcher(rawWordHeaderRegex, ElementType.Header, singleDelimiterBoth, true, false)
  const italicWordMatcher = new RegexPatternMatcher(rawWordItalicRegex, ElementType.Italic, singleDelimiterBoth, true, false)
  const underlineWordMatcher = new RegexPatternMatcher(rawWordUnderlineRegex, ElementType.UnderLine, singleDelimiterBoth, true, false)
  const codeMatcher = new RegexPatternMatcher(rawCodeRegex, ElementType.Code, tripleDelimiterBoth, false, false)
  const hashtagMatcher = new RegexPatternMatcher(rawHashtagRegex, ElementType.HashTag, singleDelimiter, false, true)
  const usernameMatcher = new RegexPatternMatcher(rawMentionRegex, ElementType.Mention, singleDelimiter, false, true)
  const hyperLinkMatcher = new RegexPatternMatcher(rawHyperLinkRegex, ElementType.HyperLink, noDelimiter, false, true)
  const quoteMatcher = new RegexPatternMatcher(rawQuoteRegex, ElementType.Quote, noDelimiter, false, true)
  const svgMatcher = new RegexPatternMatcher(rawSvgRegex, ElementType.Svg, noDelimiter, false, true)
  const spoilerMatcher = new RegexPatternMatcher(rawSpoilerRegex, ElementType.Spoiler, tripleDelimiterBoth, true, true)
  const spoilerWordMatcher = new RegexPatternMatcher(rawWordSpoilerRegex, ElementType.Spoiler, singleDelimiterBoth, true, true)
  return [
    boldMatcher, headerMatcher,
    spoilerMatcher,
    hashtagMatcher, italicMatcher, usernameMatcher, hyperLinkMatcher, quoteMatcher, underlineMatcher,
    codeMatcher,
    svgMatcher,
    boldWordMatcher, headerWordMatcher, italicWordMatcher, underlineWordMatcher, spoilerWordMatcher,
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
    case ElementType.HyperLink: {
      const hyperLink = document.createElement("hyper-link")

      let matchArray: RegExpExecArray | null
      if (typeof child === "string") {
        const regex = new RegExp(rawHyperLinkRegex)
        console.log(`Hyper link ${child}`)
        while ((matchArray = regex.exec(child)) !== null) {
          if (matchArray.length === 3) {
            const url = matchArray[2]
            const tag = matchArray[1]
            hyperLink.setAttribute("data-link", url)
            hyperLink.setAttribute("data-link-name", tag)
          }
        }
      }

      return hyperLink
    }
    case ElementType.Mention: return wrapTag("b", child, "mention")
    case ElementType.HashTag: return wrapTag("b", child, "hashtag")
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

function replaceEveryOtherBackslash(inputString: string) {
  const escapableCharacters = '*#@_|>`\\'.split('')

  let outputString = ""
  let i = 0;
  while (i < inputString.length) {
    if (inputString.charAt(i) === '\\'
      && i + 1 < inputString.length
      && escapableCharacters.find(x => inputString.charAt(i + 1) == x)) {
      console.log(`Escaping ${inputString.charAt(i)} @ ${i}`)
      i += 1
    }
    outputString += inputString.charAt(i)
    i += 1
  }


  return outputString
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
      const el = {
        text: inputText.substring(current, match.a.start),
        elementType: currentTypes,
      }
      if (el.text.length !== 0) {
        const result = _parseText2(el, patternMatchers)
        elements.push(...result)
      }
    }

    const matchTypes: ElementType = match.b.singleType ? match.b.matchType : (currentTypes | match.b.matchType)
    const element: Element = {
      text: match.b.delimiter(inputText.substring(match.a.start, match.a.end)),
      elementType: matchTypes,
    }
    if (element.text.length !== 0) {

      if (match.b.lookInwards) {
        const result = _parseText2(element, patternMatchers)
        elements.push(...result)
      } else {
        elements.push(element)
      }
    }

    current = match.a.end
  }

  if (current < inputText.length) {
    let text = inputText.substring(current)
    text = replaceEveryOtherBackslash(text)
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

