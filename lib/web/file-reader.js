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
  const files = el.files
  if (files.length === 0) return

  profileReader.load(el.files[0])
}
