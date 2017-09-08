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
