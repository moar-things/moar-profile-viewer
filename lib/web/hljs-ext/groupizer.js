'use strict'

// replaces spaces in indent with grouping elements
// - <span class="hljs-ext-group-start"> </span>
// - <span class="hljs-ext-group-middle"> </span>
// - <span class="hljs-ext-group-end"> </span>

/*
if (foo) {
_Tif (bar) {
_M_Tif (baz) {
_M_M__x()
_M_B}
_B}
}
*/

exports.groupize = groupize

function groupize (lines) {
  const groupInfos = lines.map(line => getGroupInfo(line))

  findGroupEnds(groupInfos)
  setGroupChars(groupInfos)
}

function setGroupChars (groupInfos) {
  for (let i = 0; i < groupInfos.length; i++) {
    const groupInfo = groupInfos[i]
    if (groupInfo.groupEnd == null) continue

    for (let j = i + 1; j < groupInfos.length; j++) {
      const nextGroupInfo = groupInfos[j]
      if (nextGroupInfo === groupInfo.groupEnd) break
    }
  }
}

// find all matching group start / ends
// yarp, it's quadratic!
function findGroupEnds (groupInfos) {
  for (let i = 0; i < groupInfos.length; i++) {
    const groupInfo = groupInfos[i]

    // if we found a group start, look for matching groupEnd
    if (groupInfo.isGroupStart) {
      const groupEnd = findGroupEnd(groupInfos, i)
      if (groupEnd != null) groupInfo.groupEnd = groupEnd
    }
  }
}

// given a group start, find a matching group end
function findGroupEnd (groupInfos, index) {
  const groupInfoStart = groupInfos[index]

  for (let i = index + 1; i < groupInfos.length; i++) {
    const groupInfo = groupInfos[i]

    // if indent < start, no match
    if (groupInfo.indent < groupInfoStart.indent) return null
    if (groupInfo.indent > groupInfoStart.indent) continue

    // see if we found a match
    if (groupInfo.isGroupEnd === groupInfoStart.isGroupStart) {
      return groupInfo
    }
  }

  return null
}

// returns {line:line, indentPart:part, indent:number, isGroupStart:boolean, isGroupEnd:boolean}
function getGroupInfo (line) {
  const result = {
    line: line,
    indentPart: line.indent,
    indent: (line.indentPart ? line.indentPart.text.length : 0),
    isGroupStart: false,
    isGroupEnd: false
  }

  if (!line.firstText) return

  let match

  match = line.lastText.text.match(RegexGroupStart)
  if (match) result.isGroupStart = match[1]

  match = line.firstText.text.match(RegexGroupEnd)
  if (match) result.isGroupEnd = match[1]

  return result
}

const RegexGroupStart = /\{|\[|\(/
const RegexGroupEnd = /\}|\]|\)/
