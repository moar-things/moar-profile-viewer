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
