(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

// convert a profile from inspector 1.2 format to moar format

module.exports = convert

const path = require('path')

const SystemPackage = '(system)'
const UnknownPackage = '(unknown)'

function convert (profileData) {
  const result = {
    meta: {},
    nodes: profileData.nodes,
    startTime: profileData.startTime,
    endTime: profileData.endTime,
    scripts: [],
    pkgs: []
  }

  addScriptsAndPkgs(result)

  return result
}

function addScriptsAndPkgs (profileData) {
  const scripts = new Map()
  const pkgs = new Map()

  for (let node of profileData.nodes) {
    const url = node.callFrame.url
    const scriptId = node.callFrame.scriptId

    if (scripts.has(scriptId)) continue

    const pkg = getPackageInfo(url)
    if (!pkgs.has(pkg.url)) pkgs.set(pkg.url, pkg)

    scripts.set(scriptId, {
      id: scriptId,
      url: url,
      pkgUrl: pkg.url
    })
  }

  profileData.scripts = Array.from(scripts.values())
  profileData.pkgs = Array.from(pkgs.values())
}

// node
//   callFrame: {
//     scriptId: "0"
//     url: ""

// script key of id
//   id: "45"
//   url: "internal/process/next_tick.js"
//   pkg: "(system)"

// pkgs key of path
//   path: "(unknown)"
//   name: "(unknown)"
// },

// return {path: 'dir-of-package.json', name: 'package-name'}
function getPackageInfo (url) {
  if (url == null || url === '') return { url: SystemPackage, name: SystemPackage }
  if (url[0] !== '/') return { url: SystemPackage, name: SystemPackage }

  const match = url.match(/(.*)\/node_modules\/(.*)/i)
  if (match == null) {
    return {url: UnknownPackage, name: UnknownPackage}
  }

  const pathStart = match[1]
  const pathEnd = match[2]
  const pathEndParts = pathEnd.split('/')

  let packageName = pathEndParts[0] || ''
  if (packageName[0] === '@') {
    packageName = pathEndParts.slice(0, 2).join('/')
  }

  const packageUrl = path.join(pathStart, 'node_modules', packageName)

  return {
    url: packageUrl,
    name: packageName
  }
}

},{"path":17}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
'use strict'

// create a profile object from a raw JSON profile object
// - v8-profiler objects
// - moar-profiler objects

module.exports = create

const path = require('path')

const googAnalytics = require('./google-analytics')

const convertV8ProfilerToInspector12 = require('./convert-v8-to-12')
const convertInspector12ToMoarProfiler = require('./convert-12-to-moar')

// create raw profile data into objects
function create (profileData) {
  googAnalytics.sendEvent({eventCategory: 'profile-load', eventAction: 'attempt'})

  if (!isMoarProfiler(profileData)) {
    if (isV8Profiler(profileData)) profileData = convertV8ProfilerToInspector12(profileData)
    if (isInspector12(profileData)) profileData = convertInspector12ToMoarProfiler(profileData)
  }

  if (profileData == null) return null
  if (!isMoarProfiler(profileData)) return null

  googAnalytics.sendEvent({eventCategory: 'profile-load', eventAction: 'success'})

  return buildProfile(profileData)
}

// build the basic objects for the profile
function buildProfile (profileData) {
  const profile = new Profile()

  // create basic structure
  profile.meta = createMeta(profileData.meta)
  profile.totalTime = profileData.endTime - profileData.startTime
  profile.totalSamples = 0
  profile.nodes = profileData.nodes.map(node => createNode(node))
  profile.fns = createFns(profileData)
  profile.scripts = profileData.scripts.map(script => createScript(script))
  profile.pkgs = profileData.pkgs.map(pkg => createPkg(pkg))

  linkObjects(profile)
  setParentsAndChildren(profile)
  setTimes(profile)
  resolveDependencies(profile)

  return profile
}

function createMeta (data) {
  const meta = new Meta()

  if (data == null) return Meta

  for (let key in data) {
    meta[key] = data[key]
  }

  return meta
}

function createNode (data) {
  const node = new Node()

  node.id = data.id
  node.fn = null
  node.line = data.callFrame.lineNumber + 1
  node.lines = []
  node.parent = null
  node.children = data.children || []
  node.selfTime = data.hitCount || 0
  node.totalTime = null
  node.isProgram = node.functionName === '(program)'
  node.isIdle = node.functionName === '(idle)'
  node.isGC = node.functionName === '(garbage collector)'

  if (data.positionTicks == null) data.positionTicks = []
  node.lines = data.positionTicks.map(positionTickInfo => {
    const line = new Line()
    line.line = positionTickInfo.line
    line.selfTime = positionTickInfo.ticks
    return line
  })

  return node
}

function createFns (profileData) {
  const fnMap = new Map()

  for (let node of profileData.nodes) {
    const callFrame = node.callFrame
    const name = callFrame.functionName || '(anonymous)'
    const id = `${name}:${callFrame.scriptId}:${callFrame.lineNumber}:${callFrame.columnNumber}`

    let fn = fnMap.get(id)
    if (fn == null) {
      fn = new Fn()
      fn.id = id
      fn.script = callFrame.scriptId
      fn.nodes = []
      fn.name = name
      fn.line = callFrame.lineNumber + 1
      fn.isAnonymous = name === '(anonymous)'
      fnMap.set(id, fn)
    }

    fn.nodes.push(node.id)
  }

  // convert to an array, reassign id to something more reasonable
  const result = Array.from(fnMap.values())
  for (let i = 0; i < result.length; i++) {
    result[i].id = `${i}`
  }

  return result
}

function createScript (data) {
  const script = new Script()

  script.id = data.id
  script.url = data.url
  script.pkg = data.pkgUrl
  script.urlInPkg = getScriptUrl(data.pkgUrl, data.url)
  script.fns = []
  script.source = data.source

  return script
}

function createPkg (data) {
  const pkg = new Pkg()

  pkg.url = data.url
  pkg.name = data.name
  pkg.version = data.version
  pkg.description = data.description
  pkg.homepage = data.homepage
  pkg.scripts = []
  pkg.dependencies = []
  pkg.isSystem = pkg.name === '(system)'
  pkg.isUnknown = pkg.name === '(unknown)'
  pkg.isSystemOrUnknown = pkg.isSystem || pkg.isUknown

  for (let type in data.dependencies) {
    for (let pkgName in data.dependencies[type]) {
      const versionRange = data.dependencies[type][pkgName]
      const dep = new Dependency()
      dep.name = pkgName
      dep.version = versionRange
      dep.type = type
      dep.pkg = null
      pkg.dependencies.push(dep)
    }
  }

  return pkg
}

// convert implicit links across objects to object references
function linkObjects (profile) {
  // build maps of from keys to objects -> object
  const nodeMap = new Map()
  const fnMap = new Map()
  const scriptMap = new Map()
  const pkgMap = new Map()

  for (let node of profile.nodes) { nodeMap.set(node.id, node) }
  for (let fn of profile.fns) { fnMap.set(fn.id, fn) }
  for (let script of profile.scripts) { scriptMap.set(script.id, script) }
  for (let pkg of profile.pkgs) { pkgMap.set(pkg.url, pkg) }

  // convert node children ids in a node to nodes
  for (let node of profile.nodes) {
    node.children = node.children.map(nodeId => nodeMap.get(nodeId))
  }

  // convert node ids in fn to nodes
  // set the fn of a node
  // add the fn to it's script
  for (let fn of profile.fns) {
    fn.nodes = fn.nodes.map(nodeId => nodeMap.get(nodeId))
    for (let node of fn.nodes) { node.fn = fn }

    fn.script = scriptMap.get(fn.script)
    fn.script.fns.push(fn)
  }

  // set the pkg of a script
  // add the script to it's pkg's scripts
  // collect the nodes of a script
  for (let script of profile.scripts) {
    script.pkg = pkgMap.get(script.pkg)
    script.pkg.scripts.push(script)
    script.nodes = reduce(script.fns, [], (acc, fn) => acc.concat(fn.nodes))
  }

  // set the pkg of a fn
  for (let fn of profile.fns) {
    fn.pkg = fn.script.pkg
  }

  // set the script and pkg of a node
  for (let node of profile.nodes) {
    node.script = node.fn.script
    node.pkg = node.script.pkg
  }

  // set the fns of a pkg
  // collect the nodes of a pkg
  // set isSystem for all objects
  for (let pkg of profile.pkgs) {
    pkg.fns = reduce(pkg.scripts, [], (acc, script) => acc.concat(script.fns))
    pkg.nodes = reduce(pkg.fns, [], (acc, fn) => acc.concat(fn.nodes))

    for (let script of pkg.scripts) script.isSystem = pkg.isSystem
    for (let fn of pkg.fns) fn.isSystem = pkg.isSystem
    for (let node of pkg.nodes) node.isSystem = pkg.isSystem
  }
}

// set the parents and children of objects
function setParentsAndChildren (profile) {
  // set the parents of nodes (children already set)
  setNodeParent(profile.nodes[0])

  // set the parents and children of fns
  for (let fn of profile.fns) {
    fn.parents = Array.from(getParents('fn', fn, fn.nodes).keys())
    fn.children = Array.from(getChildren('fn', fn, fn.nodes).keys())
  }

  // set the parents and children of scripts
  for (let script of profile.scripts) {
    script.parents = Array.from(getParents('script', script, script.nodes).keys())
    script.children = Array.from(getChildren('script', script, script.nodes).keys())
  }

  // set the parents and children of pkgs
  for (let pkg of profile.pkgs) {
    pkg.parents = Array.from(getParents('pkg', pkg, pkg.nodes).keys())
    pkg.children = Array.from(getChildren('pkg', pkg, pkg.nodes).keys())
  }
}

function getParents (key, object, nodes, resultSet) {
  if (nodes == null) nodes = object.nodes
  if (resultSet == null) resultSet = new Set()

  for (let node of nodes) {
    if (node.parent == null) continue
    const parent = node.parent

    if (parent[key] === object) {
      getParents(key, object, [ parent ], resultSet)
    } else {
      resultSet.add(parent[key])
    }
  }

  return resultSet
}

function getChildren (key, object, nodes, resultSet) {
  if (nodes == null) nodes = object.nodes
  if (resultSet == null) resultSet = new Set()

  for (let node of nodes) {
    for (let child of node.children) {
      if (child[key] === object) {
        getChildren(key, object, [ child ], resultSet)
      } else {
        resultSet.add(child[key])
      }
    }
  }

  return resultSet
}

// return the url of a script relative to it's package
function getScriptUrl (pkgUrl, scriptUrl) {
  if (pkgUrl == null) return scriptUrl
  if (pkgUrl[0] === '(') return scriptUrl
  return path.relative(pkgUrl, scriptUrl)
}

// set the self and total times
function setTimes (profile) {
  const usPerTick = microsPerTick(profile)

  // set node self times
  for (let node of profile.nodes) {
    node.selfTime = node.selfTime * usPerTick

    for (let line of node.lines) {
      line.selfTime = line.selfTime * usPerTick
    }
  }

  // set node total times
  for (let node of profile.nodes) { setTotalTime(node, [node]) }

  // fn times
  for (let fn of profile.fns) {
    const nodes = profile.nodes.filter(node => node.fn === fn)
    setSelfTime(fn, nodes)
    setTotalTime(fn, nodes)
  }

  // script times
  for (let script of profile.scripts) {
    const nodes = profile.nodes.filter(node => node.script === script)
    setSelfTime(script, nodes)
    setTotalTime(script, nodes)
  }

  // pkg times
  for (let pkg of profile.pkgs) {
    const nodes = profile.nodes.filter(node => node.pkg === pkg)
    setSelfTime(pkg, nodes)
    setTotalTime(pkg, nodes)
  }
}

function setSelfTime (object, nodes) {
  if (object.selfTime != null) return
  object.selfTime = reduce(nodes, 0, (acc, node) => acc + node.selfTime)
}

function setTotalTime (object, nodes) {
  if (object.totalTime != null) return

  const nodeSet = new Set()
  for (let node of nodes) {
    collect(node, nodeSet)
  }

  // then sum their self times
  object.totalTime = reduce(Array.from(nodeSet.values()), 0, (acc, node) => acc + node.selfTime)

  function collect (node, nodeSet) {
    nodeSet.add(node)
    for (let child of node.children) {
      collect(child, nodeSet)
    }
  }
}

function reduce (arr, init, fn) {
  return arr.reduce(fn, init)
}

// recursively set the parent of every node
function setNodeParent (node) {
  for (let child of node.children) {
    child.parent = node
    setNodeParent(child)
  }
}

// resolve package dependencies to actual packages
function resolveDependencies (profile) {
  const pkgMap = new Map()
  for (let pkg of profile.pkgs) {
    pkgMap.set(pkg.url, pkg)
  }

  for (let pkg of profile.pkgs) {
    if (pkg.url[0] === '(') continue

    for (let dep of pkg.dependencies) {
      let checkUrl = path.join(pkg.url, 'node_modules')

      while (checkUrl !== '/') {
        const resolved = pkgMap.get(path.join(checkUrl, dep.name))
        if (resolved != null) {
          dep.pkg = resolved
          break
        }
        checkUrl = path.dirname(checkUrl)
      }
    }
  }
}

// compute microseconds per tick/hit
function microsPerTick (profile) {
  const micros = profile.totalTime

  let ticks = 0
  for (let node of profile.nodes) {
    ticks += node.selfTime || 0
  }

  profile.totalSamples = ticks
  return Math.round(micros / ticks)
}

// return indication if this is a v8-profiler profile
function isV8Profiler (profile) {
  if (profile == null) return false

  const keys = 'head startTime endTime'.split(' ')

  for (let key of keys) {
    if (profile[key] == null) return false
  }

  return true
}

// return indication if this is an inspector 1.2 profile
function isInspector12 (profile) {
  if (profile == null) return false

  const keys = 'nodes startTime endTime'.split(' ')

  for (let key of keys) {
    if (profile[key] == null) return false
  }

  return true
}

// return indication if this is a moar profile profile
function isMoarProfiler (profile) {
  if (profile == null) return false

  const keys = 'meta nodes startTime endTime scripts pkgs'.split(' ')

  for (let key of keys) {
    if (profile[key] == null) return false
  }

  return true
}

class Profile {}
class Meta {}
class Node {}
class Fn {}
class Script {}
class Pkg {}
class Line {}
class Dependency {}

},{"./convert-12-to-moar":1,"./convert-v8-to-12":2,"./google-analytics":4,"path":17}],4:[function(require,module,exports){
'use strict'

exports.sendEvent = sendEvent

function sendEvent (args) {
  if (typeof window === 'undefined') return
  if (typeof window.ga !== 'function') return

  window.ga('send', 'event', args)
}

},{}],5:[function(require,module,exports){
'use strict'

const create = require('./create')

exports.create = create

},{"./create":3}],6:[function(require,module,exports){
'use strict'

exports.initialize = initialize

const EventEmitter = require('events')

const profileReader = require('./profile-reader')

const jQuery = window.jQuery

function initialize () {
  const dropHandler = new DropHandler()

  const jel = jQuery('body')
  jel.on('dragend', (event) => {})
  jel.on('dragover', (event) => { event.preventDefault() })
  jel.on('drop', (event) => dropHandler.onDrop(event))

  return dropHandler
}

class DropHandler extends EventEmitter {
  onDrop (event) {
    event = event.originalEvent || window.event

    event.stopPropagation()
    event.preventDefault()

    const dt = event.dataTransfer
    const file = dt.files[0]

    profileReader.load(file)
  }
}

},{"./profile-reader":12,"events":16}],7:[function(require,module,exports){
'use strict'

exports.initialize = initialize

const profileReader = require('./profile-reader')

const jQuery = window.jQuery

function initialize () {
  const jel = jQuery('#file-input')
  jel.change(fileSelected)
}

function fileSelected () {
  const el = jQuery('#file-input')[0]
  const file = el.files[0]

  if (file != null) profileReader.load(file)

  el.value = ''
}

},{"./profile-reader":12}],8:[function(require,module,exports){
'use strict'

exports.getInfoHtml = getInfoHtml

const utils = require('./utils')

function getInfoHtml (profile, fn) {
  const html = []

  html.push(`<p>script: <b>${utils.escapeHtml(fn.script.url)}</b></p>`)

  let pkg = fn.pkg.name
  let pkgLink
  if (fn.pkg.version == null) {
    pkg = utils.escapeHtml(pkg)
  } else {
    pkgLink = `https://npmjs.org/package/${utils.escapeHtml(fn.pkg.name)}`
    pkg += ` @ ${fn.pkg.version}`
    pkg = `${utils.escapeHtml(pkg)}`
  }

  html.push(`<p>package: <b>${pkg}</b>&nbsp;&nbsp;`)
  if (pkgLink != null) {
    html.push(`<a href="${pkgLink}" target="npm-${utils.escapeHtml(fn.pkg.name)}">`)
    html.push('<img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px">')
    html.push('</a>')
  }
  html.push('</p>')

  html.push('<table class="records-table show-user full-width">')
  html.push(createTableRows('calls', fn.children, profile.totalTime))
  html.push('<tr><td colspan="4">&nbsp;</td></tr>')
  html.push(createTableRows('callers', fn.parents, profile.totalTime))
  html.push('</table>')

  return html.join('\n')
}

function objectSort (a, b) {
  const diff = b.totalTime - a.totalTime
  if (diff !== 0) return diff

  if (a.name < b.name) return -1
  if (a.name > b.name) return 1
  return 0
}

function createTableRows (name, objects, profileTime) {
  const html = []

  objects.sort(objectSort)

  html.push('<tr class="header">')
  html.push(`<td><b>${utils.escapeHtml(name)}</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>total time</b></td>`)
  html.push(`<td><b>package</b></td>`)
  html.push('</tr>')

  for (let object of objects) {
    const onClick = `MoarProfileViewer.fnSelected('${utils.escapeHtml(object.id)}', true)`
    const userSys = object.isSystem ? 'isSystem' : 'isUser'

    const totalTime = Math.round(object.totalTime / 1000)
    const totalPercent = Math.round(100 * object.totalTime / profileTime)

    let pkg = object.pkg
    let pkgName = utils.escapeHtml(pkg.name)
    if (pkg.version) pkgName += ' @ ' + utils.escapeHtml(pkg.version)
    if (!pkg.isSystemOrUnknown) {
      pkgName += ` &nbsp;&nbsp;<a href="https://npmjs.org/package/${utils.escapeHtml(pkg.name)}" target="npm-${utils.escapeHtml(pkg.name)}"><img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px"></a>`
    }

    html.push(`<tr id="fn-record-${utils.escapeHtml(object.id)}"class="clickable ${userSys}" onclick="${onClick}">`)
    html.push(`<td>${utils.escapeHtml(object.name)}</td>`)
    html.push(`<td style="text-align:right;">${totalTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${totalPercent}%</td>`)
    html.push(`<td>${pkgName}</td>`)
    html.push('</tr>')
  }

  return html.join('\n')
}

},{"./utils":15}],9:[function(require,module,exports){
'use strict'

const jQuery = window.jQuery

const thisPackage = require('../../package.json')

const ui = require('./ui')
const modalDisplayer = require('./modal-displayer')

const paneZoomer = require('./pane-zoomer')
const dropHandler = require('./drop-handler')
const fileReader = require('./file-reader')

window.MoarProfileViewer = {
  profile: null,
  displayPrivacy: modalDisplayer.displayPrivacy,
  fnSelected: ui.fnSelected
}

console.log('MoarProfileViewer:', window.MoarProfileViewer)

jQuery(whenReady)

function whenReady () {
  paneZoomer.initialize()
  dropHandler.initialize()
  fileReader.initialize()

  jQuery('#button-sort-total').click(e => ui.sortByTotalTime(e || window.event))
  jQuery('#button-sort-self').click(e => ui.sortBySelfTime(e || window.event))
  jQuery('#button-show-all').click(e => ui.showAll(e || window.event))
  jQuery('#button-show-user').click(e => ui.showUser(e || window.event))
  jQuery('#button-scope-fn').click(e => ui.scopeFn(e || window.event))
  jQuery('#button-scope-script').click(e => ui.scopeScript(e || window.event))
  jQuery('#button-scope-package').click(e => ui.scopePackage(e || window.event))

  jQuery('#version').text(`v${thisPackage.version}`)
}

},{"../../package.json":19,"./drop-handler":6,"./file-reader":7,"./modal-displayer":10,"./pane-zoomer":11,"./ui":14}],10:[function(require,module,exports){
'use strict'

exports.displayPrivacy = displayPrivacy

function displayPrivacy () {
  window.alert(PrivacyText)
}

const PrivacyText = `
This application collects information with Google Analytics.

It collects pageviews for the primary page.  It also sends an event when attempts are made to load a profile, and when a profile is loaded successfully.  No data associated with the profile - name or data - is sent with those events, just that the attempt was made, and that the profile was loaded successfully.

That's it.  Enjoy.
`

},{}],11:[function(require,module,exports){
'use strict'

exports.initialize = initialize

const jQuery = window.jQuery

function initialize () {
  jQuery('.zoom-button').click(onClick)
}

function onClick (event) {
  event.preventDefault()
  event.stopPropagation()

  const jelPane = jQuery(event.target)
  const jelMain = jQuery('#main')

  const paneName = getPaneName(jelPane)
  if (paneName == null) return console.error('could not get pane name')

  zoom(paneName, jelMain)
}

function zoom (paneName, jelMain) {
  jelMain.toggleClass('zoom-out')
  jelMain.toggleClass(`zoom-${paneName}`)
}

function getPaneName (jelPane) {
  const id = jelPane.parent()[0].id || '' // "toolbar-t"
  const match = id.match(/^toolbar-(.*)$/)
  if (match == null) return null

  return match[1]
}

},{}],12:[function(require,module,exports){
'use strict'

exports.load = load

const Profile = require('../profile')
const ui = require('./ui')

// load a profile (from drop-handler or file-reader)
function load (file) {
  const fileReader = new window.FileReader()

  fileReader.onabort = () => reportError(file, 'interrupted')
  fileReader.onerror = () => reportError(file, 'unknown error')
  fileReader.onload = (event) => {
    const data = event.target && event.target.result
    if (data == null) return reportError(file, 'no data in file')

    let profileData
    try {
      profileData = JSON.parse(data)
    } catch (err) {
      return reportError(file, 'file does not contain JSON')
    }

    const profile = Profile.create(profileData)
    if (profile == null) {
      return reportError(file, 'file does not contain CPU profile data')
    }

    ui.load(profile, file.name)
  }

  fileReader.readAsText(file)
}

function reportError (file, message) {
  window.alert(`error reading ${file.name}: ${message}`)
}

},{"../profile":5,"./ui":14}],13:[function(require,module,exports){
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

},{"./utils":15}],14:[function(require,module,exports){
'use strict'

exports.load = load
exports.sortByTotalTime = sortByTotalTime
exports.sortBySelfTime = sortBySelfTime
exports.showAll = showAll
exports.showUser = showUser
exports.scopeFn = scopeFn
exports.scopeScript = scopeScript
exports.scopePackage = scopePackage
exports.fnSelected = fnSelected

const jQuery = window.jQuery

const utils = require('./utils')
const fnInformer = require('./fn-informer')
const sourceFormatter = require('./source-formatter')

let CurrentRecords = null
let CurrentSort = 'total'
let CurrentSelectedFn = null

function load (profile, profileName) {
  window.MoarProfileViewer.profile = profile
  console.log('loaded profile', profile)

  CurrentRecords = getFunctionRecords(profile)

  if (CurrentSort === 'total') {
    sortByTotalTime()
  } else {
    sortBySelfTime()
  }

  updateMeta(profile.meta)

  const initialContent = '<div id="initial-content-t">click a function above to see details here</div>'

  jQuery('#content-l').html(initialContent)
  jQuery('#content-r').html(initialContent)
  jQuery('#source-url').text('source')
  jQuery('#fn-info').text('info')

  jQuery('#profile-name').text(utils.escapeHtml(profileName))
  window.document.title = `${profileName} - moar profile viewer`
}

function sortByTotalTime (event) {
  if (CurrentRecords == null) return

  CurrentRecords.sort((a, b) => {
    const diff = b.totalTime - a.totalTime
    if (diff !== 0) return diff

    return a.sortId - b.sortId
  })

  displayRecords()
}

function sortBySelfTime (event) {
  if (CurrentRecords == null) return

  CurrentRecords.sort((a, b) => {
    const diff = b.selfTime - a.selfTime
    if (diff !== 0) return diff

    return a.sortId - b.sortId
  })

  displayRecords()
}

let ShowUser = true

function showAll (event) {
  ShowUser = false
  jQuery('.records-table').removeClass('show-user')
}

function showUser (event) {
  ShowUser = true
  jQuery('.records-table').addClass('show-user')
}

function showAllUserCurrent (event) {
  ShowUser ? showUser() : showAll()
}

function scopeFn (event) {
}

function scopeScript (event) {
}

function scopePackage (event) {
}

function scrollIntoViewFunctionRecord (scrollRecord) {
  if (CurrentSelectedFn == null) return

  if (scrollRecord) utils.scrollIntoView(jQuery(`#fn-record-${CurrentSelectedFn.id}`)[0])
  utils.scrollIntoView(jQuery(`#source-fn-${CurrentSelectedFn.id}`)[0])
}

function highlightSelectedFunctionRecord () {
  if (CurrentSelectedFn == null) return

  jQuery('table.records-table tr.selected').removeClass('selected')
  jQuery(`#fn-record-${CurrentSelectedFn.id}`).addClass('selected')
}

function fnSelected (fnID, scroll) {
  if (scroll == null) scroll = true

  const profile = window.MoarProfileViewer.profile

  const jelContentL = jQuery('#content-l')
  const jelContentR = jQuery('#content-r')
  const jelSourceUrl = jQuery('#source-url')
  const jelFnInfo = jQuery('#fn-info')

  const fn = profile.fns.filter(fn => fn.id === fnID)[0]
  if (fn == null) {
    jelContentL.text(`internal error: can't locate function with id ${utils.escapeHtml(fnID)}`)
    jelContentR.text(`internal error: can't locate function with id ${utils.escapeHtml(fnID)}`)
    jelSourceUrl.text('source')
    return
  }

  CurrentSelectedFn = fn

  highlightSelectedFunctionRecord()

  const infoHtml = fnInformer.getInfoHtml(profile, fn)
  jelContentL.html(infoHtml)

  let source
  let sourceName
  if (fn.script.url == null || fn.script.url === '' || fn.script.source == null || fn.script.url === '') {
    source = ''
    sourceName = 'source not available'
  } else {
    source = fn.script.source
    sourceName = fn.script.url
  }

  const totalTime = profile.totalTime
  jelContentR.html(sourceFormatter.format(source, fn.script, totalTime))

  jelFnInfo.text(`${fn.name}()`)
  jelSourceUrl.text(utils.escapeHtml(sourceName))

  showAllUserCurrent()
  setTimeout(
    () => scrollIntoViewFunctionRecord(scroll),
    10
  )
}

function updateMeta (meta) {
  const jelMeta = jQuery('#profile-meta')

  if (meta == null || meta.date == null) return jelMeta.html('')

  const html = []

  const metaDate = utils.escapeHtml(meta.date.replace('T', ' '))
  const metaMain = utils.escapeHtml(meta.mainModule)
  const metaNode = utils.escapeHtml(meta.nodeVersion)
  const metaPlat = utils.escapeHtml(`${meta.platform}/${meta.arch}`)

  html.push('<br>&nbsp;<br>')
  html.push('<span>')
  html.push(`<span class="bordered">${metaDate}</span>`)
  html.push(`<span class="bordered">${metaMain}</span>`)
  html.push(`<span class="bordered">node ${metaNode}</span>`)
  html.push(`<span class="bordered">${metaPlat}</span>`)
  html.push('</span>')

  jelMeta.html(html.join('\n'))
}

function displayRecords () {
  const jelContentT = jQuery('#content-t')
  const html = []

  html.push('<table class="records-table show-user full-width">')

  html.push('<thead>')
  html.push('<tr>')
  html.push(`<td><b>function</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>total time</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>self time</b></td>`)
  html.push(`<td><b>script</b></td>`)
  html.push(`<td><b>package</b></td>`)
  html.push('</tr>')
  html.push('</thead>')

  html.push('<tbody>')
  for (let record of CurrentRecords) {
    const onClick = `MoarProfileViewer.fnSelected('${utils.escapeHtml(record.id)}', false)`
    const userSys = record.isSystem ? 'isSystem' : 'isUser'

    html.push(`<tr id="fn-record-${record.id}"class="clickable ${userSys}" onclick="${onClick}">`)
    html.push(`<td>${record.fn}</td>`)
    html.push(`<td style="text-align:right;">${record.totalTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${record.totalPercent}%</td>`)
    html.push(`<td style="text-align:right;">${record.selfTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${record.selfPercent}%</td>`)
    html.push(`<td>${utils.escapeHtml(record.script)}</td>`)
    html.push(`<td>${record.pkg}</td>`)
    html.push('</tr>')
  }

  html.push('</tbody>')
  html.push('</table>')

  jelContentT.html(html.join('\n'))

  showAllUserCurrent()

  setTimeout(
    () => {
      highlightSelectedFunctionRecord()
      scrollIntoViewFunctionRecord(true)
    },
    10
  )
}

function getFunctionRecords (profile) {
  let id = 0
  return profile.fns.map(fn => {
    let pkg = fn.script.pkg
    let pkgName = utils.escapeHtml(pkg.name)
    if (pkg.version) pkgName += ' @ ' + utils.escapeHtml(pkg.version)
    if (!pkg.isSystemOrUnknown) {
      pkgName += ` &nbsp;&nbsp;<a href="https://npmjs.org/package/${utils.escapeHtml(pkg.name)}" target="npm-${utils.escapeHtml(pkg.name)}"><img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px"></a>`
    }

    let name = fn.name
    if (name.startsWith('RegExp:') && name.length > 20) {
      name = `${name.substr(0, 20)} ...`
    }

    name = utils.escapeHtml(name)
    if (fn.name.startsWith('(')) name = `<i>${name}</i>`

    const selfTime = getSelfTime(fn)
    const totalTime = getTotalTime(fn)
    const selfPercent = selfTime / profile.totalTime
    const totalPercent = totalTime / profile.totalTime

    return {
      id: fn.id,
      sortId: id++,
      fn: name,
      selfTime: Math.round(selfTime / 1000),
      selfPercent: Math.round(selfPercent * 100),
      totalTime: Math.round(totalTime / 1000),
      totalPercent: Math.round(totalPercent * 100),
      script: fn.script.urlInPkg,
      pkg: pkgName,
      isSystem: fn.pkg.isSystem
    }
  })
}

function getSelfTime (fn) {
  return reduce(fn.nodes, 0, (acc, node) => acc + node.selfTime)
}

function getTotalTime (fn) {
  // collect all the nodes
  const nodes = new Set()
  for (let node of fn.nodes) {
    collect(node, nodes)
  }

  // then sum their self times
  return reduce(Array.from(nodes.values()), 0, (acc, node) => acc + node.selfTime)

  function collect (node, nodes) {
    nodes.add(node)
    for (let child of node.children) {
      collect(child, nodes)
    }
  }
}

function reduce (arr, init, fn) {
  return arr.reduce(fn, init)
}

},{"./fn-informer":8,"./source-formatter":13,"./utils":15}],15:[function(require,module,exports){
'use strict'

exports.escapeHtml = escapeHtml
exports.rightPad = rightPad
exports.scrollIntoView = scrollIntoView

function escapeHtml (string) {
  if (string == null) return ''
  return string
    .replace('&', '&amp;')
    .replace('<', '&lt;')
    .replace('>', '&gt;')
    .replace('"', '&quot;')
    .replace(`'`, '&#39;')
}

function rightPad (string, len, fill) {
  if (fill == null) fill = ' '
  string = `${string}`
  while (string.length < len) string = `${fill}${string}`
  return string
}

function scrollIntoView (element) {
  if (element == null) return
  if (typeof element.scrollIntoView !== 'function') return

  element.scrollIntoView({behavior: 'smooth'})
}

},{}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],17:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))

},{"_process":18}],18:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],19:[function(require,module,exports){
module.exports={
  "name": "moar-profile-viewer",
  "version": "1.0.0",
  "description": "converts cpuprofile files to call graphs",
  "license": "MIT",
  "author": "Patrick Mueller <pmuellr@apache.org> (https://github.com/pmuellr)",
  "homepage": "https://github.com/moar-things/moar-profile-viewer",
  "repository": {
    "type": "git",
    "url": "https://github.com/moar-things/moar-profile-viewer.git"
  },
  "bugs": {
    "url": "https://github.com/moar-things/moar-profile-viewer/issues"
  },
  "scripts": {
    "build": "node tools/build",
    "sample": "cd test/fixtures && ../../moar-profile-viewer.js express-jade.cpuprofile",
    "standard": "echo 'running standard' && standard -v",
    "testU": "npm -s run utest",
    "test": "npm -s run utest && npm -s run standard",
    "utest": "node test/index.js | FORCE_COLOR=1 tap-spec",
    "watch": "nodemon --exec 'node tools/watch-task'"
  },
  "standard": {
    "ignore": [
      "/tmp/",
      "/docs/"
    ]
  },
  "dependencies": {
    "jquery": "~3.2.1"
  },
  "devDependencies": {
    "browserify": "~14.4.0",
    "cat-source-map": "~0.1.2",
    "chalk": "~2.1.0",
    "less": "~2.7.2",
    "nodemon": "~1.11.1",
    "shelljs": "~0.7.8",
    "st": "~1.2.0",
    "standard": "~10.0.3",
    "tap-spec": "~4.1.1",
    "tape": "~4.8.0",
    "yield-callback": "~1.0.0"
  }
}

},{}]},{},[9])
// sourceMappingURL annotation removed by cat-source-map

//# sourceMappingURL=app.js.map.json