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
