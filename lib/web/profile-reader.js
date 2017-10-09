'use strict'

exports.load = load

const Profile = require('../profile')
const ui = require('./ui')

// load a profile (from drop-handler or file-reader)
function load (file) {
  const fileReader = new window.FileReader()

  fileReader.onabort = () => reportError(file, 'interrupted')
  fileReader.onerror = () => reportError(file, 'unknown error')
  fileReader.onload = (event) => {
    const data = event.target && event.target.result
    if (data == null) return reportError(file, 'no data in file')

    let profileData
    try {
      profileData = JSON.parse(data)
    } catch (err) {
      return reportError(file, 'file does not contain JSON')
    }

    const profile = Profile.create(profileData)
    if (profile == null) {
      return reportError(file, 'file does not contain CPU profile data')
    }

    profile.fileName = file.name
    ui.state.set({profile})
    ui.events.emit('profile-loaded', profile)
  }

  fileReader.readAsText(file)
}

function reportError (file, message) {
  window.alert(`error reading ${file.name}: ${message}`)
}
