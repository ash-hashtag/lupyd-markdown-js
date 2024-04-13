
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
  CustomStyle = 4096 * 2,
}

const MAX_ELEMENT_TYPE = ElementType.CustomStyle

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

function iterateTypes(type: ElementType) {
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

function wrapToHtmlElement(child: string | HTMLElement, type: ElementType) {
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
    }
    case ElementType.PlaceHolderLink: return aTag(typeof child === "string" ? child : "#")
    case ElementType.CustomStyle:

  }

  if (typeof child === "string") {
    return wrapTag("span", child)
  } else {
    return child
  }
}

function convertToHTMLElement(element: Element): HTMLElement {
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

export class LupydMarkdown extends HTMLElement {
  readonly markdown: Markdown
  constructor(markdown: Markdown) {
    super()
    this.markdown = markdown
  }
  connectedCallback() {
    this.render()
  }

  render() {
    console.time(`Markdown render`)
    const children = this.markdown.elements.map(convertToHTMLElement)
    this.replaceChildren(...children)
    console.timeEnd(`Markdown render`)
  }
}


customElements.define("lupyd-markdown", LupydMarkdown)
