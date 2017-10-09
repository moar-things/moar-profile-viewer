'use strict'

const urlBase = require('../lib/urlBase')

const utils = require('./lib/utils')

const runTest = utils.createTestRunner(__filename)

runTest(function test (t) {
  let paths

  paths = []
  t.equal(urlBase(paths), '', 'no paths')

  paths = [ '(System)' ]
  t.equal(urlBase(paths), '', 'no absolute paths')

  paths = [ null ]
  t.equal(urlBase(paths), '', 'null path')

  paths = [ '/a/b', '/a/c', null ]
  t.equal(urlBase(paths), '/a', 'some good paths and a null path')

  paths = [ '/a', '/b', '/c' ]
  t.equal(urlBase(paths), '', 'no common path')

  paths = [ '/a/b', '/a/c', '(Unknown)', 'a/b/c' ]
  t.equal(urlBase(paths), '/a', 'one segment common path')

  paths = [ '/a/b', '/a/b/c', null, 'a/b/d' ]
  t.equal(urlBase(paths), '/a/b', 'two segment common path')

  paths = [ '/a/b/c', '/a/b/c/d', null, 'a/b/c/e' ]
  t.equal(urlBase(paths), '/a/b/c', 'three segment common path')

  t.end()
})
