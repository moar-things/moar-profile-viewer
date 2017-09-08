#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')

const Graphviz = require('viz.js')

const pkg = require('./package.json')
const CallGraph = require('./lib/callGraph')
const Profile = require('./lib/profile')

const logger = require('./lib/logger').getLogger(__filename)

// invoked as cli
function cli () {
  const cpFile = process.argv[2]

  if (cpFile == null) help()

  const profileData = readProfileData(cpFile)
  const profile = Profile.create(profileData)
  const callGraph = CallGraph.create(profile)
  const dotContent = callGraph.generateGraphviz()

  const dotFile = `${path.basename(cpFile)}.dot`
  fs.writeFileSync(dotFile, dotContent)
  logger.log(`wrote file: "${dotFile}"`)

  const svg = Graphviz(dotContent)

  const svgFile = `${path.basename(cpFile)}.svg`
  fs.writeFileSync(svgFile, svg)
  logger.log(`wrote file: "${svgFile}"`)
}

// read and parse a .cpuprofile file
function readProfileData (fileName) {
  let contents

  try {
    contents = fs.readFileSync(fileName, 'utf8')
  } catch (err) {
    logger.log(`error reading file ${fileName}: ${err}`)
    process.exit(1)
  }

  let profileData
  try {
    profileData = JSON.parse(contents)
  } catch (err) {
    logger.log(`error parsing JSON in file ${fileName}: ${err}`)
    process.exit(1)
  }

  return profileData
}

// print help and exit
function help () {
  console.log(getHelp())
  process.exit(0)
}

// get help text
function getHelp () {
  const helpFile = path.join(__dirname, 'HELP.md')
  let helpText = fs.readFileSync(helpFile, 'utf8')

  helpText = helpText.replace(/%%program%%/g, pkg.name)
  helpText = helpText.replace(/%%version%%/g, pkg.version)

  return helpText
}

// run cli if invoked as main module
if (require.main === module) cli()
