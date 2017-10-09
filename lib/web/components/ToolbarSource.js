'use strict'

const React = require('react')

const ZoomableComponent = require('./ZoomableComponent')

const ui = require('../ui')

module.exports = class ToolbarSource extends ZoomableComponent {
  constructor (props) {
    super(props)

    this.zoomPane = 'r'
    this.state = {
      sourceUrl: 'source'
    }

    ui.state.on({
      selected: (record) => {
        let sourceUrl = 'source'
        if (record != null) sourceUrl = record.script.url
        this.setState({sourceUrl})
      }
    })
  }

  render () {
    return (
      <div id='toolbar-r'>
        <div className='zoom-button' onClick={this.handleZoom} />
        <span>{this.state.sourceUrl}</span>
      </div>
    )
  }
}
