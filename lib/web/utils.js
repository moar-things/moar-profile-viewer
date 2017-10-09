'use strict'

exports.escapeHtml = escapeHtml
exports.rightPad = rightPad
exports.scrollIntoView = scrollIntoView
exports.bindMethods = bindMethods

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

  element.scrollIntoView()
}

function bindMethods (object, regex) {
  const originalObject = object

  while (object != null) {
    if (object === Object) break

    const descriptors = Object.getOwnPropertyDescriptors(object)
    for (let descriptorName in descriptors) {
      const descriptor = descriptors[descriptorName]
      if (typeof descriptor.value !== 'function') continue
      if (!descriptorName.match(regex)) continue

      originalObject[descriptorName] = originalObject[descriptorName].bind(originalObject)
    }

    object = Object.getPrototypeOf(object)
  }
}
