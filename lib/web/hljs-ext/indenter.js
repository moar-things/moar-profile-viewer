'use strict'

exports.addIndents = addIndents

const Parts = require('./parts')

function addIndents (lines) {
  for (let line of lines) {
    addIndent(line)
  }
}

function addIndent (line) {
  for (let part of line.parts) {
    // looking for first text part
    if (!part.isText) continue

    // split into indent and rest
    const match = part.text.match(RegexIndent)
    const indent = match[1]
    const rest = match[2]

    // not indented, return
    if (indent === '') return

    // replace this part with wrapped indent and rest
    const newParts = []
    newParts.push(Parts.createTagStart('<span class="hljs-ext-indent">'))
    newParts.push(Parts.createText(indent))
    newParts.push(Parts.createTagEnd('</span>'))
    newParts.push(Parts.createText(rest))

    line.replacePart(part, newParts)

    // only handle the first part
    return
  }
}

const RegexIndent = /^(\s*)(.*)$/
