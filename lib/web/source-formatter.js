'use strict'

exports.format = format

const utils = require('./utils')

// given JS source and a script object, return an HTML formatted version
function format (source, script, profileTime) {
  const hasSource = source !== ''
  const shownLines = new Set()

  // get the line hits data
  const lineHits = getLineHits(script)

  // split the lines
  let lines = source
    .split('\n')
    .map(line => `<span class="source-line">${utils.escapeHtml(line)}</span>`)

  // wrap function lines
  for (let fn of script.fns) {
    const lineNo = (fn.line || 1) - 1
    shownLines.add(lineNo)
    const onClick = `MoarProfileViewer.fnSelected('${utils.escapeHtml(fn.id)}')`
    lines[lineNo] = `<span class="source-line-function clickable" id="source-fn-${utils.escapeHtml(fn.id)}" onclick="${onClick}">${lines[lineNo] || ''}</span>`
  }

  // wrap linehit lines
  for (let lineHit of lineHits) {
    const lineNo = lineHit.line
    shownLines.add(lineNo)
    lines[lineNo] = `<span class="source-line-linehit">${lines[lineNo] || ''}</span>`
  }

  // add line numbers
  for (let i = 0; i < lines.length; i++) {
    lines[i] = `<div><span class="source-lineno">${utils.rightPad(i, 6)}</span>${lines[i] || ''}</div>`
  }

  // add annotation for function lines
  for (let fn of script.fns) {
    const lineNo = (fn.line || 1) - 1
    const selfTime = Math.round(fn.selfTime / 1000)
    const selfPercent = Math.round(100 * fn.selfTime / profileTime)
    const totalTime = Math.round(fn.totalTime / 1000)
    const totalPercent = Math.round(100 * fn.totalTime / profileTime)

    shownLines.add(lineNo)
    let newLine = []
    newLine.push(`<span class="source-lineno">${utils.rightPad('', 6)}</span>`)
    newLine.push('<span class="source-function">')
    newLine.push(`${utils.escapeHtml(fn.name)}() - `)
    newLine.push(`total time: ${totalTime} ms, ${totalPercent}%; `)
    newLine.push(`self time: ${selfTime} ms, ${selfPercent}%`)
    newLine.push('</span>')

    const onClick = `MoarProfileViewer.fnSelected('${utils.escapeHtml(fn.id)}')`
    lines[lineNo] = `${lines[lineNo]}<div class="clickable source-annotation" onclick="${onClick}">${newLine.join('')}</div>`
  }

  // add annotation for line hits
  for (let lineHit of lineHits) {
    const lineNo = lineHit.line
    const selfTime = Math.round(lineHit.selfTime / 1000)
    const selfPercent = Math.round(100 * lineHit.selfTime / profileTime)

    shownLines.add(lineNo)
    let newLine = []
    newLine.push(`<span class="source-lineno">${utils.rightPad('', 6)}</span>`)
    newLine.push('<span class="source-linehit">')
    newLine.push(`self time: ${selfTime} ms, ${selfPercent}%`)
    newLine.push('</span>')
    lines[lineNo] = `${lines[lineNo]}<div class="source-annotation">${newLine.join('')}</div>`
  }

  // if no source is available, only show interesting lines
  if (!hasSource) {
    const newLines = []
    const interestingLines = Array.from(shownLines.keys()).sort((a, b) => a - b)
    for (let lineNo of interestingLines) {
      newLines.push(lines[lineNo])
      newLines.push('<p>&nbsp;</p>')
    }

    lines = newLines
  }

  // wrap in a div
  return `<div class="source-lines">${lines.join('')}</div>`
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
