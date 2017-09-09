'use strict'

exports.sendEvent = sendEvent

function sendEvent (args) {
  if (typeof window === 'undefined') return
  if (typeof window.ga !== 'function') return

  window.ga('send', 'event', args)
}
