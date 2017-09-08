'use strict'

exports.load = load
exports.sortByTotalTime = sortByTotalTime
exports.sortBySelfTime = sortBySelfTime
exports.showAll = showAll
exports.showUser = showUser
exports.scopeFn = scopeFn
exports.scopeScript = scopeScript
exports.scopePackage = scopePackage
exports.fnSelected = fnSelected

const jQuery = window.jQuery

const fnInformer = require('./fn-informer')
const sourceFormatter = require('./source-formatter')

let CurrentRecords = null
let CurrentSort = 'total'
let CurrentSelectedRecordTR = null

function load (profile, profileName) {
  window.MoarProfileViewer.profile = profile
  console.log('loaded profile', profile)

  CurrentRecords = getFunctionRecords(profile)

  if (CurrentSort === 'total') {
    sortByTotalTime()
  } else {
    sortBySelfTime()
  }

  updateMeta(profile.meta)

  jQuery('#content-l').html('')
  jQuery('#content-r').html('')
  jQuery('#source-url').text('source')
  jQuery('#fn-info').text('info')

  jQuery('#profile-name').text(profileName)
  window.document.title = `${profileName} - moar profile viewer`
}

function sortByTotalTime (event) {
  if (CurrentRecords == null) return

  CurrentRecords.sort((a, b) => {
    const diff = b.totalTime - a.totalTime
    if (diff !== 0) return diff

    return a.sortId - b.sortId
  })

  displayRecords()
}

function sortBySelfTime (event) {
  if (CurrentRecords == null) return

  CurrentRecords.sort((a, b) => {
    const diff = b.selfTime - a.selfTime
    if (diff !== 0) return diff

    return a.sortId - b.sortId
  })

  displayRecords()
}

let ShowUser = true

function showAll (event) {
  ShowUser = false
  jQuery('.records-table').removeClass('show-user')
}

function showUser (event) {
  ShowUser = true
  jQuery('.records-table').addClass('show-user')
}

function showCurrent (event) {
  ShowUser ? showUser() : showAll()
}

function scopeFn (event) {
}

function scopeScript (event) {
}

function scopePackage (event) {
}

function fnSelected (fnID, scroll) {
  if (scroll == null) scroll = true

  const profile = window.MoarProfileViewer.profile

  if (scroll) jQuery(`#fn-record-${fnID}`)[0].scrollIntoView()

  if (CurrentSelectedRecordTR != null) {
    jQuery(CurrentSelectedRecordTR).removeClass('selected')
  }

  if (window.event.currentTarget != null) {
    CurrentSelectedRecordTR = window.event.currentTarget
    jQuery(CurrentSelectedRecordTR).addClass('selected')
  }

  const jelContentL = jQuery('#content-l')
  const jelContentR = jQuery('#content-r')
  const jelSourceUrl = jQuery('#source-url')
  const jelFnInfo = jQuery('#fn-info')

  const fn = profile.fns.filter(fn => fn.id === fnID)[0]
  if (fn == null) {
    jelContentL.text(`internal error: can't locate function with id ${fnID}`)
    jelContentR.text(`internal error: can't locate function with id ${fnID}`)
    jelSourceUrl.text('source')
    return
  }

  const infoHtml = fnInformer.getInfoHtml(profile, fn)
  jelContentL.html(infoHtml)

  let source
  let sourceName
  if (fn.script.url == null || fn.script.url === '' || fn.script.source == null || fn.script.url === '') {
    source = ''
    sourceName = 'source not available'
  } else {
    source = fn.script.source
    sourceName = fn.script.url
  }

  const totalTime = profile.totalTime
  jelContentR.html(sourceFormatter.format(source, fn.script, totalTime))

  setTimeout(() => {
    showCurrent()
    const fnEl = jQuery(`#source-fn-${fn.id}`)[0]
    if (fnEl != null) fnEl.scrollIntoView()
  }, 10)

  jelFnInfo.text(`${fn.name}()`)
  jelSourceUrl.text(sourceName)
}

function updateMeta (meta) {
  const jelMeta = jQuery('#profile-meta')

  if (meta == null || meta.date == null) return jelMeta.html('')

  const html = []

  html.push('<br>&nbsp;<br>')
  html.push('<span>')
  html.push(`<span class="bordered">${meta.date.replace('T', ' ')}</span>`)
  html.push(`<span class="bordered">${meta.mainModule}</span>`)
  html.push(`<span class="bordered">node ${meta.nodeVersion}</span>`)
  html.push(`<span class="bordered">${meta.platform}/${meta.arch}</span>`)
  html.push('</span>')

  jelMeta.html(html.join('\n'))
}

function displayRecords () {
  const jelContentT = jQuery('#content-t')
  const html = []

  html.push('<table class="records-table show-user full-width">')

  html.push('<tr>')
  html.push(`<td><b>function</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>total time</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>self time</b></td>`)
  html.push(`<td><b>script</b></td>`)
  html.push(`<td><b>package</b></td>`)
  html.push('</tr>')

  for (let record of CurrentRecords) {
    const onClick = `MoarProfileViewer.fnSelected('${record.id}', false)`
    const userSys = record.isSystem ? 'isSystem' : 'isUser'

    html.push(`<tr id="fn-record-${record.id}"class="clickable ${userSys}" onclick="${onClick}">`)
    html.push(`<td>${record.fn}</td>`)
    html.push(`<td style="text-align:right;">${record.totalTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${record.totalPercent}%</td>`)
    html.push(`<td style="text-align:right;">${record.selfTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${record.selfPercent}%</td>`)
    html.push(`<td>${record.script}</td>`)
    html.push(`<td>${record.pkg}</td>`)
    html.push('</tr>')
  }

  html.push('</table>')

  jelContentT.html(html.join('\n'))
}

function getFunctionRecords (profile) {
  let id = 0
  return profile.fns.map(fn => {
    let pkg = fn.script.pkg
    let pkgName = pkg.name
    if (pkg.version) pkgName += ' @ ' + pkg.version
    if (!pkg.isSystemOrUnknown) {
      pkgName += ` &nbsp;&nbsp;<a href="https://npmjs.org/package/${pkg.name}" target="npm-${pkg.name}"><img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px"></a>`
    }

    let name = fn.name
    if (name.startsWith('RegExp:') && name.length > 20) {
      name = `${name.substr(0, 20)} ...`
    }

    if (fn.name.startsWith('(')) name = `<i>${name}</i>`

    const selfTime = getSelfTime(fn)
    const totalTime = getTotalTime(fn)
    const selfPercent = selfTime / profile.totalTime
    const totalPercent = totalTime / profile.totalTime

    return {
      id: fn.id,
      sortId: id++,
      fn: name,
      selfTime: Math.round(selfTime / 1000),
      selfPercent: Math.round(selfPercent * 100),
      totalTime: Math.round(totalTime / 1000),
      totalPercent: Math.round(totalPercent * 100),
      script: fn.script.urlInPkg,
      pkg: pkgName,
      isSystem: fn.pkg.isSystem
    }
  })
}

function getSelfTime (fn) {
  return reduce(fn.nodes, 0, (acc, node) => acc + node.selfTime)
}

function getTotalTime (fn) {
  // collect all the nodes
  const nodes = new Set()
  for (let node of fn.nodes) {
    collect(node, nodes)
  }

  // then sum their self times
  return reduce(Array.from(nodes.values()), 0, (acc, node) => acc + node.selfTime)

  function collect (node, nodes) {
    nodes.add(node)
    for (let child of node.children) {
      collect(child, nodes)
    }
  }
}

function reduce (arr, init, fn) {
  return arr.reduce(fn, init)
}
