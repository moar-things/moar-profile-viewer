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
