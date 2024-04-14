
export const rawHyperLinkRegex = /\[(.+)\]\((.+)\)/gm
export const rawBoldRegex = /(?<!\\)\*\*\*(.*?)(?<!\\)\*\*\*/gm
export const rawItalicRegex = /(?<!\\)\/\/\/(.*?)(?<!\\)\/\/\//gm
export const rawUnderlineRegex = /(?<!\\)___(.*?)(?<!\\)___/gm
export const rawHeaderRegex = /(?<!\\)###(.*?)(?<!\\)###/gm
export const rawCodeRegex = /(?<!\\)```(.*?)(?<!\\)```/gm
export const rawSpoilerRegex = /(?<!\\)\|\|\|(.*?)(?<!\\)\|\|\|/gm
export const rawHashtagRegex = /(?<!\\)#\w+/gm
export const rawMentionRegex = /(?<!\\)@\w+/gm
export const rawQuoteRegex = /^>\|\s.*$/gm
export const rawSvgRegex = /(?<!\\)<svg\s*(?:\s+[^>]+)?>(?:(?!<\/svg>).)*?(?<!\\)<\/svg>/gm

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
export enum ElementType {
  Normal = 0,
  Bold = 1,
  Italic = 2,
  Header = 4,
  UnderLine = 8,
  Code = 16,
  Quote = 32,
  Spoiler = 64,
  HyperLink = 128,
  Mention = 256,
  HashTag = 512,
  ImageLink = 1024,
  VideoLink = 2048,
  PlaceHolderLink = 4096,
  Svg = 4096 * 2,
}

const MAX_ELEMENT_TYPE = ElementType.Svg

export interface Markdown {
  elements: Element[];
}

export interface Element {
  elementType: ElementType;
  text: string;
}

function hasType(type: ElementType, checkType: ElementType) {
  return (type & checkType) === checkType
}

export function iterateTypes(type: ElementType) {
  const types: ElementType[] = []
  let checkType = MAX_ELEMENT_TYPE
  while (checkType) {
    if (hasType(type, checkType)) {
      types.push(checkType)
    }
    checkType = checkType >> 1
  }

  return types
}


export type WrapToHtmlElementFunction = (_: string | HTMLElement, __: ElementType) => HTMLElement


const style = `
.spoiler, .spoiler a { 
  color: black; 
  background-color: black;
}

.spoiler:hover, .spoiler:hover a {
  background-color: white;
}
`
new CSSStyleSheet().replace(style).then((ss) => {
  document.adoptedStyleSheets.push(ss)
}).catch(console.error)




export class LupydMarkdown extends HTMLElement {
  readonly markdown: Markdown
  readonly convertToHtmlElement: (el: Element) => HTMLElement
  constructor(markdown: Markdown, convertToHtmlElement: (el: Element) => HTMLElement) {
    super()
    this.markdown = markdown
    this.convertToHtmlElement = convertToHtmlElement
  }

  connectedCallback() {
    this.render()
  }

  render() {
    this.replaceChildren(...this.markdown.elements.map(this.convertToHtmlElement))
  }
}


customElements.define("lupyd-markdown", LupydMarkdown)



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

