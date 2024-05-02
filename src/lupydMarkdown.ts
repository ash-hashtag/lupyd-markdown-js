
export const rawHyperLinkRegex = /\[(\S+)\]\((\S+)\)/gm

export const rawBoldRegex = /(?<!\\)\*\*\*([\s\S]*?)(?<!\\)\*\*\*/gm
export const rawItalicRegex = /(?<!\\)\/\/\/([\s\S]*?)(?<!\\)\/\/\//gm
export const rawUnderlineRegex = /(?<!\\)___([\s\S]*?)(?<!\\)___/gm
export const rawHeaderRegex = /(?<!\\)###([\s\S]*?)(?<!\\)###/gm
export const rawCodeRegex = /(?<!\\)```([\s\S]*?)(?<!\\)```/gm
export const rawSpoilerRegex = /(?<!\\)\|\|\|([\s\S]*?)(?<!\\)\|\|\|/gm

export const rawHashtagRegex = /(?<!\\)#\w+/gm
export const rawMentionRegex = /(?<!\\)@\w+/gm
export const rawQuoteRegex = /^>\|\s.*$/gm
export const rawSvgRegex = /(?<!\\)<svg\s*(?:\s+[^>]+)?>(?:(?!<\/svg>).)*?(?<!\\)<\/svg>/gm

export const rawWordBoldRegex = /(?<!\\)\*(?!\s)([^\s]+)(?<!\\)\*/gm
export const rawWordItalicRegex = /(?<!\\)\/(?!\s)([^\s]+)(?<!\\)\//gm
export const rawWordUnderlineRegex = /(?<!\\)_(?!\s)([^\s]+)(?<!\\)_/gm
export const rawWordHeaderRegex = /(?<!\\)#(?!\s)([^\s]+)(?<!\\)#/gm
export const rawWordSpoilerRegex = /(?<!\\)\|(?!\s)([^\s]+)(?<!\\)\|/gm


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
  Svg = 1024,
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
  }

  connectedCallback() {
    this.render()
  }

  render() {
    const tag = this.getAttribute("data-link-name")!
    const url = this.getAttribute("data-link")!

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
    this.replaceChildren(child)
  }
}

customElements.define("hyper-link", HyperLinkElement)

