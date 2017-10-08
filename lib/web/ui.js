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

const utils = require('./utils')
const fnInformer = require('./fn-informer')
const sourceFormatter = require('./source-formatter')

const E = utils.escapeHtml
const jQuery = window.jQuery

let CurrentRecords = null
let CurrentSort = 'total'
let CurrentSelectedFn = null
let CurrentSelectedScript = null

function load (profile, profileName) {
  sourceFormatter.clear()
  CurrentSelectedFn = null
  CurrentSelectedScript = null

  window.MoarProfileViewer.profile = profile
  console.log('loaded profile', profile)

  CurrentRecords = getFunctionRecords(profile)

  if (CurrentSort === 'total') {
    sortByTotalTime()
  } else {
    sortBySelfTime()
  }

  updateMeta(profile.meta)

  const initialContent = '<div id="initial-content-t">click a function above to see details here</div>'

  jQuery('#content-l').html(initialContent)
  jQuery('#content-r').html(initialContent)
  jQuery('#source-url').text('source')
  jQuery('#fn-info').text('info')

  jQuery('#profile-name').text(E(profileName))
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

function showAllUserCurrent (event) {
  ShowUser ? showUser() : showAll()
}

function scopeFn (event) {
}

function scopeScript (event) {
}

function scopePackage (event) {
}

function scrollIntoViewFunctionRecord (scrollRecord) {
  if (CurrentSelectedFn == null) return

  if (scrollRecord) utils.scrollIntoView(jQuery(`#fn-record-${CurrentSelectedFn.id}`)[0])
  utils.scrollIntoView(jQuery(`.hljs-ext-lineno-${CurrentSelectedFn.line}`)[0])
}

function highlightSelectedFunctionRecord () {
  if (CurrentSelectedFn == null) return

  jQuery('table.records-table tr.selected').removeClass('selected')
  jQuery(`#fn-record-${CurrentSelectedFn.id}`).addClass('selected')

  const profile = window.MoarProfileViewer.profile
  const fn = profile.fns[CurrentSelectedFn.id]
  if (fn == null) {
    console.log(`can not find function with id: ${CurrentSelectedFn.id}`)
    return
  }

  // also highlight differently other fn's in the stacks of the fn
  jQuery('table.records-table .related-parent').removeClass('related-parent')
  jQuery('table.records-table .related-child').removeClass('related-child')

  let checkedFns

  checkedFns = new Set()
  highlightRelatedChildren(fn)

  checkedFns = new Set()
  highlightRelatedParents(fn)

  function highlightRelatedChildren (fn) {
    if (checkedFns.has(fn)) return
    checkedFns.add(fn)

    for (let fnRelated of fn.children) {
      jQuery(`#fn-record-${fnRelated.id}`).addClass('related-child')
      highlightRelatedChildren(fnRelated)
    }
  }

  function highlightRelatedParents (fn) {
    if (checkedFns.has(fn)) return
    checkedFns.add(fn)

    for (let fnRelated of fn.parents) {
      jQuery(`#fn-record-${fnRelated.id}`).addClass(`related-parent`)
      highlightRelatedParents(fnRelated)
    }
  }
}

function fnSelected (fnID, scroll) {
  if (scroll == null) scroll = true

  const profile = window.MoarProfileViewer.profile

  const jelContentL = jQuery('#content-l')
  const jelContentR = jQuery('#content-r')
  const jelSourceUrl = jQuery('#source-url')
  const jelFnInfo = jQuery('#fn-info')

  const fn = profile.fns.filter(fn => fn.id === fnID)[0]
  if (fn == null) {
    jelContentL.text(`internal error: can't locate function with id ${E(fnID)}`)
    jelContentR.text(`internal error: can't locate function with id ${E(fnID)}`)
    jelSourceUrl.text('source')
    return
  }

  CurrentSelectedFn = fn

  highlightSelectedFunctionRecord()

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

  if (CurrentSelectedScript !== fn.script) {
    CurrentSelectedScript = fn.script
    const totalTime = profile.totalTime
    jelContentR[0].innerHTML = sourceFormatter.format(source, fn.script, totalTime)
  }

  jelFnInfo.text(`${fn.name}()`)
  jelSourceUrl.text(E(sourceName))

  showAllUserCurrent()
  setTimeout(
    () => scrollIntoViewFunctionRecord(scroll),
    10
  )
}

function updateMeta (meta) {
  const jelMeta = jQuery('#profile-meta')

  if (meta == null || meta.date == null) return jelMeta.html('')

  const html = []

  const metaDate = E(localeDate(meta.date))
  const metaMain = E(meta.mainModule)
  const metaNode = E(meta.nodeVersion)
  const metaPlat = E(`${meta.platform}/${meta.arch}`)

  html.push('<span>')
  html.push(`<span class="bordered">${metaDate}</span>`)
  html.push(`<span class="bordered">${metaMain}</span>`)
  html.push(`<span class="bordered">node ${metaNode}</span>`)
  html.push(`<span class="bordered">${metaPlat}</span>`)
  html.push('</span>')

  jelMeta.html(html.join('\n'))
}

function displayRecords () {
  const jelContentT = jQuery('#content-t')
  const html = []

  html.push('<table class="records-table show-user full-width">')

  html.push('<thead>')
  html.push('<tr>')
  html.push(`<td><b>function</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>total time</b></td>`)
  html.push(`<td style="text-align:center;" colspan="2"><b>self time</b></td>`)
  html.push(`<td><b>script</b></td>`)
  html.push(`<td><b>package</b></td>`)
  html.push('</tr>')
  html.push('</thead>')

  html.push('<tbody>')
  for (let record of CurrentRecords) {
    const onClick = `MoarProfileViewer.fnSelected('${E(record.id)}', false)`
    const userSys = record.isSystem ? 'isSystem' : 'isUser'

    html.push(`<tr id="fn-record-${record.id}"class="clickable ${userSys}" onclick="${onClick}">`)
    html.push(`<td>${record.fn}</td>`)
    html.push(`<td style="text-align:right;">${record.totalTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${record.totalPercent}%</td>`)
    html.push(`<td style="text-align:right;">${record.selfTime}&nbsp;ms</td>`)
    html.push(`<td style="text-align:right;">${record.selfPercent}%</td>`)
    html.push(`<td>${E(record.script)}</td>`)
    html.push(`<td>${record.pkg}</td>`)
    html.push('</tr>')
  }

  html.push('</tbody>')
  html.push('</table>')

  jelContentT.html(html.join('\n'))

  showAllUserCurrent()

  setTimeout(
    () => {
      highlightSelectedFunctionRecord()
      scrollIntoViewFunctionRecord(true)
    },
    10
  )
}

function getFunctionRecords (profile) {
  let id = 0
  return profile.fns.map(fn => {
    let pkg = fn.script.pkg
    let pkgName = E(pkg.name)
    if (pkg.version) pkgName += ' @ ' + E(pkg.version)
    if (!pkg.isSystemOrUnknown) {
      pkgName += ` &nbsp;&nbsp;<a href="https://npmjs.org/package/${E(pkg.name)}" target="npm-${E(pkg.name)}"><img src="images/open-iconic/external-link-8x.png" alt="npm" width="12px"></a>`
    }

    let name = fn.name
    if (name.startsWith('RegExp:') && name.length > 20) {
      name = `${name.substr(0, 20)} ...`
    }

    name = E(name)
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

function localeDate (dateString) {
  const date = new Date(Date.parse(dateString))
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

function reduce (arr, init, fn) {
  return arr.reduce(fn, init)
}
