'use strict'

const fs = require('fs')
const path = require('path')

const Profile = require('../lib/profile')

const utils = require('./lib/utils')

const runTest = utils.createTestRunner(__filename)

runTest(testMoar)
runTest(testV8)
runTest(test12)

function testMoar (t) {
  test(t, path.join(__dirname, 'fixtures', 'a-b.moar.cpuprofile'))
}

function testV8 (t) {
  test(t, path.join(__dirname, 'fixtures', 'a-b.v8.cpuprofile'))
}

function test12 (t) {
  test(t, path.join(__dirname, 'fixtures', 'a-b.12.cpuprofile'))
}

function test (t, file) {
  let profile = JSON.parse(fs.readFileSync(file, 'utf8'))

  profile = Profile.create(profile)

  // console.log(JSON.stringify(profile, null, 4))
  // if (Date.now()) return t.end()

  // top level properties
  t.equal(typeof profile.meta, 'object', 'profile.meta should be an object')
  t.equal(typeof profile.totalTime, 'number', 'profile.totalTime should be a number')
  t.equal(typeof profile.totalSamples, 'number', 'profile.totalSamples should be a number')
  t.ok(Array.isArray(profile.nodes), 'profile.nodes should be an array')
  t.ok(Array.isArray(profile.fns), 'profile.fns should be an array')
  t.ok(Array.isArray(profile.scripts), 'profile.scripts should be an array')
  t.ok(Array.isArray(profile.pkgs), 'profile.pkgs should be an array')

  // nodes
  let parentLessNodes = 0
  for (let node of profile.nodes) {
    t.equal(typeof node.fn, 'object', 'node.fn should be an object')
    t.equal(typeof node.line, 'number', 'node.line should be a number')
    t.ok(Array.isArray(node.lines), 'node.lines should be an array')
    t.ok(Array.isArray(node.children), 'node.children should be an array')
    t.equal(typeof node.selfTime, 'number', 'node.selfTime should be a number')
    t.equal(typeof node.totalTime, 'number', 'node.totalTime should be a number')
    t.equal(typeof node.isProgram, 'boolean', 'node.isProgram should be a boolean')
    t.equal(typeof node.isIdle, 'boolean', 'node.isIdle should be a boolean')
    t.equal(typeof node.isGC, 'boolean', 'node.isGC should be a boolean')

    t.ok(profile.fns.indexOf(node.fn) !== -1, 'node.fn should be in profile.fns')

    t.ok(node.fn.nodes.indexOf(node) !== -1, 'node should be in node.fn.nodes')

    for (let line of node.lines) {
      t.equal(typeof line.line, 'number', 'line.line should be a number')
      t.equal(typeof line.selfTime, 'number', 'line.selfTime should be a number')
    }

    for (let child of node.children) {
      t.ok(profile.nodes.indexOf(child) !== -1, 'node.child should be in nodes')
    }

    if (node.parent == null) {
      parentLessNodes++
    } else {
      t.ok(node.parent.children.indexOf(node) !== -1, 'node should be in node.parent.children')
    }
  }

  t.equal(parentLessNodes, 1, 'should only be one parent-less node')

  // fns
  for (let fn of profile.fns) {
    t.equal(typeof fn.script, 'object', 'fn.script should be an object')
    t.ok(Array.isArray(fn.nodes), 'fn.nodes should be an array')
    t.equal(typeof fn.name, 'string', 'fn.name should be a string')
    t.equal(typeof fn.line, 'number', 'fn.line should be a number')

    t.ok(fn.script.fns.indexOf(fn) !== -1, 'fn should be in fn.script.fns')

    for (let node of fn.nodes) {
      t.equal(node.fn, fn, 'fn.nodes[].fn should be this fn')
    }
  }

  // scripts
  for (let script of profile.scripts) {
    t.equal(typeof script.url, 'string', 'script.url should be a string')
    t.equal(typeof script.pkg, 'object', `script.pkg should be an object`)
    t.ok(Array.isArray(script.fns), 'script.fns should be an array')
    t.ok(profile.pkgs.indexOf(script.pkg) !== -1, 'script.pkg should be in profile.pkgs')

    for (let fn of script.fns) {
      t.equal(fn.script, script, 'script.fns[].script should be this script')
    }
  }

  // pkgs
  for (let pkg of profile.pkgs) {
    t.equal(typeof pkg.url, 'string', 'pkg.url should be a string')
    t.equal(typeof pkg.name, 'string', 'pkg.name should be a string')
    t.ok(Array.isArray(pkg.scripts), 'pkg.scripts should be an array')

    for (let script of pkg.scripts) {
      t.equal(script.pkg, pkg, 'pkg.scripts[].pkg should be this pkg')
    }
  }

  t.end()
}
