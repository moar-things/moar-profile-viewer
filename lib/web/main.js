'use strict'

const jQuery = window.jQuery

const React = require('react')
const ReactDOM = require('react-dom')

const ui = require('./ui')

const Page = require('./components/Page')

window.MoarProfileViewer = {
  profile: null,
  fnSelected: ui.fnSelected
}

console.log('MoarProfileViewer:', window.MoarProfileViewer)

ReactDOM.render(
  <Page />,
  document.getElementById('body')
)

jQuery(whenReady)

function whenReady () {
  jQuery('#button-sort-total').click(e => ui.sortByTotalTime(e || window.event))
  jQuery('#button-sort-self').click(e => ui.sortBySelfTime(e || window.event))
  jQuery('#button-show-all').click(e => ui.showAll(e || window.event))
  jQuery('#button-show-user').click(e => ui.showUser(e || window.event))
}
