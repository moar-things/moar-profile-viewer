#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')

const less = require('less')
const shelljs = require('shelljs')
const yieldCallback = require('yield-callback')

const utils = require('../lib/utils')
const buildModules = require('./build-modules')

const logger = require('../lib/logger').getLogger(__filename)

const cp = shelljs.cp
const rm = shelljs.rm
const mkdir = shelljs.mkdir

const projectPath = utils.projectPath

// main function
const main = yieldCallback(mainGen)

function * mainGen (cb) {
  const timeStarted = Date.now()

  yield buildModules.main(cb)
  if (cb.err) return cb.err

  const lessInput = yield fs.readFile('./css/app.less', 'utf8', cb)
  if (cb.err) return cb.err

  const cssOutput = yield lessRender(lessInput, cb)
  if (cb.err) return cb.err

  yield fs.writeFile('./docs/app.css', cssOutput.css, cb)
  if (cb.err) return cb.err

  const jqueryVersion = getPackageVersion('jquery')
  if (jqueryVersion == null) return new Error('error looking for version for jQuery')
  cp(
    projectPath('node_modules/jquery/dist/jquery.min.js'),
    projectPath(`docs/jquery-${jqueryVersion}.js`)
  )

  const bsdDir = projectPath('docs/bootstrap')
  const bsmDir = projectPath('node_modules/bootstrap/dist')

  rm('-rf', bsdDir)
  mkdir('-p', path.join(bsdDir, 'css'))
  mkdir('-p', path.join(bsdDir, 'fonts'))
  mkdir('-p', path.join(bsdDir, 'js'))

  cp(path.join(bsmDir, 'css', 'bootstrap-theme.min.css'), path.join(bsdDir, 'css'))
  cp(path.join(bsmDir, 'css', 'bootstrap.min.css'), path.join(bsdDir, 'css'))

  cp(path.join(bsmDir, 'fonts', 'glyphicons-halflings-regular.eot'), path.join(bsdDir, 'fonts'))
  cp(path.join(bsmDir, 'fonts', 'glyphicons-halflings-regular.ttf'), path.join(bsdDir, 'fonts'))
  cp(path.join(bsmDir, 'fonts', 'glyphicons-halflings-regular.woff'), path.join(bsdDir, 'fonts'))
  cp(path.join(bsmDir, 'fonts', 'glyphicons-halflings-regular.woff2'), path.join(bsdDir, 'fonts'))

  cp(path.join(bsmDir, 'js', 'bootstrap.js'), path.join(bsdDir, 'js'))

  const timeElapsed = (Date.now() - timeStarted) / 1000
  logger.log(`successful build in ${timeElapsed.toLocaleString()} seconds`)
}

// done late since main is a variable
exports.main = (cb) => main(cb || function () {})

// invoke main if requested
if (require.main === module) {
  main((err) => {
    if (err) process.exit(1)
  })
}

// invoke less async, since it uses an errback but isn't async
function lessRender (input, cb) {
  setImmediate(() => less.render(input, cb))
}

// get the version of a package
function getPackageVersion (pkg) {
  let pkgJson
  const pkgModule = `${pkg}/package.json`

  try {
    pkgJson = require(pkgModule)
  } catch (err) {
    console.log(`require(${pkgModule}): ERROR! - ${err}`)
    return null
  }

  return pkgJson.version
}
