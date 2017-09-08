'use strict'

// convert a profile from v8profiler to inspector 1.2 format

module.exports = convert

function convert (profileData) {
  const result = {
    nodes: nodeTreeToArray(profileData.head),
    startTime: profileData.startTime * 1000 * 1000,
    endTime: profileData.endTime * 1000 * 1000
  }

  if (result.nodes == null) return null
  return result
}

function nodeTreeToArray (node, array) {
  if (node == null) return
  if (array == null) array = []

  const newNode = convertNode(node)
  array.push(newNode)

  // if no children, done!
  if (node.children == null || node.children.length === 0) return array

  // build array of children ids
  for (let child of node.children) {
    newNode.children.push(child.id)
  }

  // recursively process children
  for (let child of node.children) {
    const result = nodeTreeToArray(child, array)
    if (result == null) return null
  }

  return array
}

// convert a node -- see structure below
function convertNode (nodeV8) {
  const result = {
    id: nodeV8.id,
    callFrame: {
      functionName: nodeV8.functionName,
      scriptId: `${nodeV8.scriptId}`,
      url: nodeV8.url,
      lineNumber: nodeV8.lineNumber,
      columnNumber: nodeV8.columnNumber
    },
    hitCount: nodeV8.hitCount
  }

  if (nodeV8.bailoutReason != null) result.deoptReason = nodeV8.bailoutReason

  result.children = []

  if (nodeV8.lineTicks) {
    result.positionTicks = []
    for (let lineTick of nodeV8.lineTicks) {
      result.positionTicks.push({
        line: lineTick.line,
        ticks: lineTick.hitCount
      })
    }
  }

  return result
}

// -----------------------------------------------------------------------------
// v8
// -----------------------------------------------------------------------------

// "functionName": "wait",
// "url": "/Users/pmuellr/Projects/moar-profile-viewer/test/fixtures/a-b.js",
// "lineNumber": 23,
// "callUID": 4,
// "bailoutReason": "no reason",
// "id": 15,
// "scriptId": 77,
// "hitCount": 1077,
// "children": [],
// "lineTicks": [
//   {
//     "line": 24,
//     "hitCount": 2
//   },
//   {
//     "line": 25,
//     "hitCount": 1075
//   }
// ]

// -----------------------------------------------------------------------------
// 1.2
// -----------------------------------------------------------------------------

// "id": 13,
// "callFrame": {
//   "functionName": "wait",
//   "scriptId": "77",
//   "url": "/Users/pmuellr/Projects/moar-profile-viewer/test/fixtures/a-b.js",
//   "lineNumber": 20,
//   "columnNumber": 14
// },
// "hitCount": 1074,
// "deoptReason": "TryCatchStatement"
// "positionTicks": [
//   {
//     "line": 22,
//     "ticks": 6
//   },
//   {
//     "line": 23,
//     "ticks": 1068
//   }
// ]
