'use strict'

exports.displayPrivacy = displayPrivacy

function displayPrivacy () {
  window.alert(PrivacyText)
}

const PrivacyText = `
This application collects information with Google Analytics.

It collects pageviews for the primary page.  It also sends an event when attempts are made to load a profile, and when a profile is loaded successfully.  No data associated with the profile - name or data - is sent with those events, just that the attempt was made, and that the profile was loaded successfully.

That's it.  Enjoy.
`
