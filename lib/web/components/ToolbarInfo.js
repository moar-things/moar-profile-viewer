'use strict'

const React = require('react')

const ZoomableComponent = require('./ZoomableComponent')

module.exports = class ToolbarInfo extends ZoomableComponent {
  constructor (props) {
    super(props)

    this.zoomPane = 'l'
    this.state = {}
  }

  render () {
    return (
      <div id='toolbar-l'>
        <div className='zoom-button' onClick={this.handleZoom} title='zoom' />
        <span id='fn-info'>info</span>
      </div>
    )
  }
}
