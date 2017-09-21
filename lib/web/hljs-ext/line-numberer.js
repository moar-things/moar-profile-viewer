'use strict'

exports.addLineNumbers = addLineNumbers

const Parts = require('./parts')

function addLineNumbers (lines) {
  let lineNumber = 0
  for (let line of lines) {
    lineNumber++

    // wrap existing line in a <td>
    line.appendPart(Parts.createTagEnd('</td>'))
    line.prependPart(Parts.createTagStart(`<td class="hljs-ext-line">`))

    // prepend the lineno <td> in front
    line.prependPart(Parts.createTagEnd('</td>'))
    line.prependPart(Parts.createText(`${lineNumber}`))
    line.prependPart(Parts.createTagStart(`<td class="hljs-ext-lineno hljs-ext-lineno-${lineNumber}">`))

    // wrap line in a <tr>
    line.prependPart(Parts.createTagStart('<tr>'))
    line.appendPart(Parts.createTagEnd('</tr>'))
  }
}
