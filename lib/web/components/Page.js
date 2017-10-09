'use strict'

const React = require('react')

const Component = require('./Component')

const PageHeader = require('./PageHeader')
const ToolbarFunctions = require('./ToolbarFunctions')
const ContentFunctions = require('./ContentFunctions')
const ToolbarInfo = require('./ToolbarInfo')
const ContentInfo = require('./ContentInfo')
const ToolbarSource = require('./ToolbarSource')
const ContentSource = require('./ContentSource')

const ui = require('../ui')
const profileReader = require('../profile-reader')

module.exports = class Page extends Component {
  constructor (props) {
    super(props)

    ui.state.on({
      zoom: this.handleZoom
    })

    this.state = {
      zoom: 'out'
    }

    ui.events.on('profile-loaded', profile => this.setState({profile}))
    ui.events.on('record-selected', record => this.setState({record}))
  }

  render () {
    const profile = this.state.profile
    const record = this.state.record
    return (
      <div id='main' className={`zoom-${this.state.zoom}`}
        onDragOver={this.handleDragOver} onDrop={this.handleDrop}
        >
        <PageHeader profile={profile} record={record} />

        <ToolbarFunctions profile={profile} record={record} />
        <ContentFunctions profile={profile} record={record} />

        <ToolbarInfo profile={profile} record={record} />
        <ContentInfo profile={profile} record={record} />

        <ToolbarSource profile={profile} record={record} />
        <ContentSource profile={profile} record={record} />
      </div>
    )
  }

  handleZoom (pane) {
    this.setState(prevState => {
      const newZoom = prevState.zoom !== 'out' ? 'out' : pane
      return {zoom: newZoom}
    })
  }

  handleDragOver (event) {
    event.preventDefault()
  }

  handleDrop (event) {
    event.stopPropagation()
    event.preventDefault()

    const dt = event.dataTransfer
    if (dt == null) return

    const file = dt.files[0]

    profileReader.load(file)
  }
}
