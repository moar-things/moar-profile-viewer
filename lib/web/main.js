'use strict'

const jQuery = window.jQuery

const thisPackage = require('../../package.json')

const ui = require('./ui')
const modalDisplayer = require('./modal-displayer')

const paneZoomer = require('./pane-zoomer')
const dropHandler = require('./drop-handler')
const fileReader = require('./file-reader')

window.MoarProfileViewer = {
  profile: null,
  displayPrivacy: modalDisplayer.displayPrivacy,
  fnSelected: ui.fnSelected
}

console.log('MoarProfileViewer:', window.MoarProfileViewer)

jQuery(whenReady)

function whenReady () {
  paneZoomer.initialize()
  dropHandler.initialize()
  fileReader.initialize()

  jQuery('#button-sort-total').click(e => ui.sortByTotalTime(e || window.event))
  jQuery('#button-sort-self').click(e => ui.sortBySelfTime(e || window.event))
  jQuery('#button-show-all').click(e => ui.showAll(e || window.event))
  jQuery('#button-show-user').click(e => ui.showUser(e || window.event))
  jQuery('#button-scope-fn').click(e => ui.scopeFn(e || window.event))
  jQuery('#button-scope-script').click(e => ui.scopeScript(e || window.event))
  jQuery('#button-scope-package').click(e => ui.scopePackage(e || window.event))

  jQuery('#version').text(`v${thisPackage.version}`)
}
