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
