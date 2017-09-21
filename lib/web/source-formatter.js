'use strict'

exports.format = format

const utils = require('./utils')
const hljs = require('highlight.js')
const hljsExt = require('./hljs-ext')

// given JS source and a script object, return an HTML formatted version
function format (source, script, profileTime) {
  if (source === '') {
    return '<p>no source available</p>'
  }

  // get the line hits data
  const lineHits = getLineHits(script)

  // split the lines
  const hl = hljs.highlight('js', source, true)
  hljsExt.extend(hl)
  source = hl.value

  let lines = source
    .split('\n')

  // add annotation for function lines
  for (let fn of script.fns) {
    const lineNo = (fn.line || 1) - 1
    const selfTime = Math.round(fn.selfTime / 1000)
    const selfPercent = Math.round(100 * fn.selfTime / profileTime)
    const totalTime = Math.round(fn.totalTime / 1000)
    const totalPercent = Math.round(100 * fn.totalTime / profileTime)

    // <tr><td class="hljs-ext-lineno"></td><td class=""></td></tr>
    const onClick = `MoarProfileViewer.fnSelected('${utils.escapeHtml(fn.id)}')`

    let newLine = []
    newLine.push('<tr><td class="hljs-ext-lineno"></td><td>')
    newLine.push(`<span class="source-function clickable source-annotation" onclick="${onClick}">`)
    newLine.push(`${utils.escapeHtml(fn.name)}() - `)
    newLine.push(`total time: ${totalTime} ms, ${totalPercent}%; `)
    newLine.push(`self time: ${selfTime} ms, ${selfPercent}%`)
    newLine.push('</span></td></tr>')

    lines[lineNo] = `${lines[lineNo]}${newLine.join('')}`
    lines[lineNo] = `${lines[lineNo]}<tr><td class="hljs-ext-lineno"></td><td class=""></td></tr>`
  }

  // add annotation for line hits
  for (let lineHit of lineHits) {
    const lineNo = lineHit.line
    const selfTime = Math.round(lineHit.selfTime / 1000)
    const selfPercent = Math.round(100 * lineHit.selfTime / profileTime)

    let newLine = []
    newLine.push('<tr><td class="hljs-ext-lineno"></td><td>')
    newLine.push('<span class="source-linehit">')
    newLine.push(`self time: ${selfTime} ms, ${selfPercent}%`)
    newLine.push('</span></td></tr>')
    lines[lineNo] = `${lines[lineNo]}${newLine.join('')}`
  }

  return `<table class="hljs-file full-width">\n${lines.join('\n')}\n</table>`
}

// returns [] of {line, selfTime}[] for a script
function getLineHits (script) {
  const linesMap = new Map()

  // get the line hit results
  for (let node of script.nodes) {
    for (let line of node.lines) {
      let selfTime = linesMap.get(line.line)
      if (selfTime == null) selfTime = 0

      selfTime += line.selfTime
      linesMap.set(line.line, selfTime)
    }
  }

  const result = []
  for (let line of linesMap.keys()) {
    result.push({line: line, selfTime: linesMap.get(line)})
  }
  return result
}
