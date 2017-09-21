'use strict'

exports.create = create

const Parts = require('./parts')

// create a Line object from a line of hljs (line genned from highlight.js)
function create (hljsLine) {
  return new Line(hljsLine)
}

class Line {
  constructor (hljsLine) {
    this._parts = Parts.parseString(hljsLine)

    this._firstText = null
    this._lastText = null
    this._indent = null

    for (let part of this._parts) {
      if (!part.isText) continue
      if (this._firstText == null) {
        this._firstText = part
        if (part.text[0] === ' ') this._indent = part
      }
      this._lastText = part
    }
  }

  get firstText () { return this._firstText }
  get lastText () { return this._lastText }
  get indent () { return this._indent }
  get parts () { return this._parts }
  get string () { return this._parts.map(part => part.text).join('') }

  appendPart (part) {
    this._parts.push(part)
  }

  prependPart (part) {
    this._parts.unshift(part)
  }

  replacePart (part, parts) {
    const index = this._parts.indexOf(part)
    if (index === -1) return

    const args = [index, 1].concat(parts)
    this._parts.splice.apply(this._parts, args)
  }
}
