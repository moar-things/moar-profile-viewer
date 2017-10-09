'use strict'

const React = require('react')

const ZoomableComponent = require('./ZoomableComponent')

const ui = require('../ui')
const profileReader = require('../profile-reader')

module.exports = class ToolbarFunctions extends ZoomableComponent {
  constructor (props) {
    super(props)

    this.zoomPane = 't'
    this.state = {}

    this.state = ui.state.get({sort: 'total', show: 'user'})

    ui.state.on({
      sort: (value) => this.setState({sort: value}),
      show: (value) => this.setState({show: value})
    })
  }

  handleSort (event) { ui.state.set({sort: event.target.value}) }
  handleShow (event) { ui.state.set({show: event.target.value}) }

  handleLoadFile (event) {
    const el = event.target
    if (el == null) return

    const file = el.files[0]
    if (el == null) return

    profileReader.load(file)
    el.value = ''
  }

  render () {
    return (
      <div id='toolbar-t'>
        <div>
          <div className='zoom-button' onClick={this.handleZoom} />
          &nbsp;
          <input type='file' accept='.cpuprofile' onChange={this.handleLoadFile} />
          sort by time:
          <input type='radio' name='sort' value='total'
            onChange={this.handleSort}
            checked={this.state.sort === 'total'} />
          total
          <input type='radio' name='sort' value='self'
            onChange={this.handleSort}
            checked={this.state.sort === 'self'} />
          self
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          show:
          <input type='radio' name='show' value='all'
            onChange={this.handleShow}
            checked={this.state.show === 'all'} />
          all
          <input type='radio' name='show' value='user'
            onChange={this.handleShow}
            checked={this.state.show === 'user'} />
          user
        </div>
        <div id='profile-meta' />
      </div>
    )
  }
}
