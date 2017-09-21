'use strict'

exports.respan = respan

const Parts = require('./parts')

// given html from hljs, respan so that no span crosses lines
function respan (lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // push tagStarts, pop tagEnds
    const spanStack = []
    for (let part of line.parts) {
      if (part.isTagStart) spanStack.push(part)
      if (part.isTagEnd) spanStack.pop()
    }

    // if no hanging spans, just continue
    if (spanStack.length === 0) continue

    // shouldn't happen, but just in case
    const nextLine = lines[i + 1]
    if (nextLine == null) continue

    // add span ends to current line
    spanStack.forEach(part => { line.appendPart(Parts.createTagEnd('</span>')) })

    // add span starts to next line
    spanStack.reverse()
    spanStack.forEach(part => { nextLine.prependPart(part) })
  }
}
