'use strict'

exports.getInfoHtml = getInfoHtml

const utils = require('./utils')

function getInfoHtml (profile, fn) {
  const html = []

  html.push(`<p>in script: ${utils.escapeHtml(fn.script.url)}`)

  let pkg = fn.pkg.name
  let pkgLink
  if (fn.pkg.version == null) {
    pkg = utils.escapeHtml(pkg)
  } else {
    pkgLink = `https://npmjs.org/package/${fn.pkg.name}`
    pkg += ` @ ${fn.pkg.version}`
    pkg = `${utils.escapeHtml(pkg)}`
  }

  html.push(`<p>in package: ${pkg}`)
  if (pkgLink != null) {
    html.push(`<a href="https://npmjs.org/package/${fn.pkg.name}" target="npm-${fn.pkg.name}">`)
    html.push('<img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px">')
    html.push('</a>')
  }

  html.push('<table class="records-table show-user full-width">')
  html.push(createTableRows('callers', fn.parents, profile.totalTime))
  html.push('<tr><td colspan="3">&nbsp;</td></tr>')
  html.push(createTableRows('calls', fn.children, profile.totalTime))
  html.push('</table>')

  return html.join('\n')
}

function createTableRows (name, objects, profileTime) {
  const html = []

  html.push('<tr>')
  html.push(`<td><b>${name}</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>total time</b></td>`)
  html.push('</tr>')

  for (let object of objects) {
    const onClick = `MoarProfileViewer.fnSelected('${object.id}', true)`
    const userSys = object.isSystem ? 'isSystem' : 'isUser'

    const totalTime = Math.round(object.totalTime / 1000)
    const totalPercent = Math.round(100 * object.totalTime / profileTime)

    html.push(`<tr id="fn-record-${object.id}"class="clickable ${userSys}" onclick="${onClick}">`)
    html.push(`<td>${object.name}</td>`)
    html.push(`<td style="text-align:right;">${totalTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${totalPercent}%</td>`)
    html.push('</tr>')
  }

  return html.join('\n')
}
