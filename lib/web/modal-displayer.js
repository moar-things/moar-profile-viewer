'use strict'

exports.displayPrivacy = displayPrivacy

function displayPrivacy () {
  window.alert(PrivacyText)
}

const PrivacyText = `
This application collects typical page view information Google Analytics.

It also collects information when profiles are loaded, but only that a profile was loaded, not the name of the profile file, nor it's data.

But that's it.  Enjoy.
`
