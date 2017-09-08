'use strict'

// given an array of URLs, return the longest prefix

module.exports = urlBase

function urlBase (paths) {
  const pathComponents = paths
    .filter(path => path != null && path[0] === '/')
    .map(path => path.split('/').slice(1))

  if (pathComponents.length === 0) return ''

  let checkDepth = 0
  while (true) {
    if (!isCommonComponent(pathComponents, checkDepth)) break
    checkDepth++
  }

  const result = pathComponents[0].slice(0, checkDepth).join('/')
  if (result === '') return result

  return `/${result}`
}

function isCommonComponent (pathComponents, depth) {
  const check = pathComponents[0][depth]
  if (check == null) return false

  for (let pathComponent of pathComponents) {
    if (check !== pathComponent[depth]) return false
  }

  return true
}
