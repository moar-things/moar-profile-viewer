'use strict'

exports.getInfoHtml = getInfoHtml

const utils = require('./utils')

function getInfoHtml (profile, fn) {
  const html = []

  html.push(`<p>script: <b>${utils.escapeHtml(fn.script.url)}</b></p>`)

  let pkg = fn.pkg.name
  let pkgLink
  if (fn.pkg.version == null) {
    pkg = utils.escapeHtml(pkg)
  } else {
    pkgLink = `https://npmjs.org/package/${utils.escapeHtml(fn.pkg.name)}`
    pkg += ` @ ${fn.pkg.version}`
    pkg = `${utils.escapeHtml(pkg)}`
  }

  html.push(`<p>package: <b>${pkg}</b>&nbsp;&nbsp;`)
  if (pkgLink != null) {
    html.push(`<a href="${pkgLink}" target="npm-${utils.escapeHtml(fn.pkg.name)}">`)
    html.push('<img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px">')
    html.push('</a>')
  }
  html.push('</p>')

  html.push('<table class="records-table show-user full-width">')
  html.push(createTableRows('calls', fn.children, profile.totalTime))
  html.push('<tr><td colspan="4">&nbsp;</td></tr>')
  html.push(createTableRows('callers', fn.parents, profile.totalTime))
  html.push('</table>')

  return html.join('\n')
}

function objectSort (a, b) {
  const diff = b.totalTime - a.totalTime
  if (diff !== 0) return diff

  if (a.name < b.name) return -1
  if (a.name > b.name) return 1
  return 0
}

function createTableRows (name, objects, profileTime) {
  const html = []

  objects.sort(objectSort)

  html.push('<tr class="header">')
  html.push(`<td><b>${utils.escapeHtml(name)}</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>total time</b></td>`)
  html.push(`<td><b>package</b></td>`)
  html.push('</tr>')

  for (let object of objects) {
    const onClick = `MoarProfileViewer.fnSelected('${utils.escapeHtml(object.id)}', true)`
    const userSys = object.isSystem ? 'isSystem' : 'isUser'

    const totalTime = Math.round(object.totalTime / 1000)
    const totalPercent = Math.round(100 * object.totalTime / profileTime)

    let pkg = object.pkg
    let pkgName = utils.escapeHtml(pkg.name)
    if (pkg.version) pkgName += ' @ ' + utils.escapeHtml(pkg.version)
    if (!pkg.isSystemOrUnknown) {
      pkgName += ` &nbsp;&nbsp;<a href="https://npmjs.org/package/${utils.escapeHtml(pkg.name)}" target="npm-${utils.escapeHtml(pkg.name)}"><img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px"></a>`
    }

    html.push(`<tr id="fn-record-${utils.escapeHtml(object.id)}"class="clickable ${userSys}" onclick="${onClick}">`)
    html.push(`<td>${utils.escapeHtml(object.name)}</td>`)
    html.push(`<td style="text-align:right;">${totalTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${totalPercent}%</td>`)
    html.push(`<td>${pkgName}</td>`)
    html.push('</tr>')
  }

  return html.join('\n')
}
