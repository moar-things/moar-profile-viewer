'use strict'

exports.parseString = parseString
exports.createText = createText
exports.createTagStart = createTagStart
exports.createTagEnd = createTagEnd

function createText (text) { return new Part(text, TYPE_TEXT) }
function createTagStart (text) { return new Part(text, TYPE_TAG_START) }
function createTagEnd (text) { return new Part(text, TYPE_TAG_END) }

class Part {
  constructor (text, type) {
    this._text = text
    this._type = type
  }

  get text () { return this._text }
  get isText () { return this._type === TYPE_TEXT }
  get isTagStart () { return this._type === TYPE_TAG_START }
  get isTagEnd () { return this._type === TYPE_TAG_END }
}

function parseString (string) {
  let parts = []

  // iterate through line
  while (string !== '') {
    let part

    // split into text / <span ...> / </span>
    const match = string.match(RegexPart)
    if (match == null) {
      // this shouldn't happen, regexp is bad if so
      string = ''
      part = createText(string)
    } else {
      string = match[5]

      // convert what was matched to a part
      if (match[2] != null) part = createText(match[2])
      else if (match[3] != null) part = createTagEnd(match[3])
      else if (match[4] != null) part = createTagStart(match[4])
    }

    parts.push(part)
  }

  return parts
}

const TYPE_TEXT = 'text'
const TYPE_TAG_START = 'tagStart'
const TYPE_TAG_END = 'tagEnd'

const RegexPart = /^(([^<]+)|(<\/.*?>)|(<[^/].*?>))(.*)$/
