'use strict'

const Component = require('./Component')

const ui = require('../ui')

module.exports = class ZoomableComponent extends Component {
  constructor (props) {
    super(props)

    // for subclasses, this should be the name of the zoompane
    this.zoomPane = 'out'
  }

  handleZoom (event) {
    const currentZoom = ui.state.get({zoom: 'out'}).zoom
    const nextZoom = currentZoom !== 'out' ? 'out' : this.zoomPane
    ui.state.set({zoom: nextZoom})
  }
}
