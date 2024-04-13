import { Element, ElementType } from "./lupydMarkdown"


const rawBoldRegex = /(?<!\\)\*\*\*(.*?)(?<!\\)\*\*\*/gm
const rawItalicRegex = /(?<!\\)\/\/\/(.*?)(?<!\\)\/\/\//gm
const rawUnderlineRegex = /(?<!\\)___(.*?)(?<!\\)___/gm
const rawHeaderRegex = /(?<!\\)###(.*?)(?<!\\)###/gm
const rawCodeRegex = /(?<!\\)```(.*?)(?<!\\)```/gm
const rawHashtagRegex = /(?<!\\)#\w+/gm
const rawMentionRegex = /(?<!\\)@\w+/gm
const rawQuoteRegex = /^>\|\s.*$/gm
const rawHyperLinkRegex = /\[(.+)\]\((.+)\)/gm

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
  return [
    boldMatcher, headerMatcher, hashtagMatcher, italicMatcher, usernameMatcher, hyperLinkMatcher, quoteMatcher, underlineMatcher,
    codeMatcher,
  ]
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

export const getGlobalStyleSheets = async () => {
  return Promise.all(Array.from(document.styleSheets).map(x => {
    const sheet = new CSSStyleSheet()
    const cssText = Array.from(x.cssRules).map(e => e.cssText).join(' ')
    return sheet.replace(cssText)
  }))
}

export const addGlobalStyleSheetsToShadowRoot = async (shadowRoot: ShadowRoot) => {
  const sheets = await getGlobalStyleSheets()
  shadowRoot.adoptedStyleSheets.push(...sheets)
}

export class HyperLinkElement extends HTMLElement {

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    addGlobalStyleSheetsToShadowRoot(this.shadowRoot!)
  }

  connectedCallback() {
    this.render()
  }

  render() {
    const innerText = this.innerHTML.length !== 0 ? this.innerHTML : this.innerText
    if (innerText.length !== 0) {
      let matchArray: RegExpExecArray | null
      while ((matchArray = rawHyperLinkRegex.exec(innerText)) !== null) {
        if (matchArray.length === 3) {
          const url = matchArray[2]
          const tag = matchArray[1]

          let child: HTMLElement
          switch (tag) {
            case "image":
              const img = document.createElement("img")
              img.src = url
              img.alt = tag
              child = img
              break
            case "video":
              const vid = document.createElement("video")
              vid.controls = true
              vid.src = url
              child = vid
              break
            default:
              const a = document.createElement("a")
              a.innerText = tag
              a.href = url
              child = a

          }
          // this.replaceChildren(child)
          this.shadowRoot!.replaceChildren(child)
        }
      }
    }
  }
}

customElements.define("hyper-link", HyperLinkElement)

// function parseTextToHtmlElement(text: string): HTMLElement {
//   const elements = _parseText2({ text, elementType: ElementType.Normal }, defaultMatchers())
//   const p = document.createElement("p")
//   p.innerText = JSON.stringify(elements) + '\n'
//   const elem = document.createElement("div")
//   elem.append(p, new LupydMarkdown({ elements }))
//   return elem
// }


// const test = () => {
//   const inputTextArea = document.getElementById("input-text")! as HTMLTextAreaElement
//   const outputElement = document.getElementById("output-text")! as HTMLElement
//   inputTextArea.addEventListener("input", _ => {
//     const text = inputTextArea.value
//     outputElement.replaceChildren(parseTextToHtmlElement(text))
//   })
// }


// test()
