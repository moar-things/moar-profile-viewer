'use strict'

const React = require('react')
const Component = require('./Component')

const ui = require('../ui')

module.exports = class ContentSource extends Component {
  constructor (props) {
    super(props)

    this.state = {
      source: null
    }

    ui.events.on('profile-loaded', this.handleProfileLoaded)
    ui.events.on('record-selected', this.handleRecordSelected)
  }

  handleZoom (event) { ui.events.emit('zoom-clicked', 'r') }

  handleProfileLoaded (record) {
    this.setState({source: record.sourceUrl})
  }

  handleRecordSelected (record) {
    this.setState({source: 'something'})
  }

  render () {
    return (
      <div id='content-r' />
    )
  }
}
