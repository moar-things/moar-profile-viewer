'use strict'

const React = require('react')

const Component = require('./Component')

const thisPackage = require('../../../package.json')

module.exports = class PageHeader extends Component {
  constructor (props) {
    super(props)

    this.state = {}
  }

  handleDisplayPrivacy () {
    window.alert(PrivacyText)
  }

  render () {
    return (
      <div id='header'>
        <span>
          <span className='float-left'>
            moar profile viewer
            &nbsp;
            <i><span id='version'>v{thisPackage.version}</span></i>
            &nbsp;&nbsp;
            <span id='profile-name' />
          </span>
          <span className='float-right'>
            <a href='https://github.com/moar-things/moar-profile-viewer' target='github'>github</a>
            &nbsp;|&nbsp;
            <a href='#' onClick={this.handleDisplayPrivacy}>privacy</a>
            &nbsp;|&nbsp;
            <a href='help.html' target='help'>help</a>
          </span>
        </span>
      </div>
    )
  }
}

const PrivacyText = `
This application collects information with Google Analytics.

It collects pageviews for the primary page.  It also sends an event when attempts are made to load a profile, and when a profile is loaded successfully.  No data associated with the profile - name or data - is sent with those events, just that the attempt was made, and that the profile was loaded successfully.

That's it.  Enjoy.
`
