'use strict'

exports.escapeHtml = escapeHtml
exports.rightPad = rightPad

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
