'use strict'

const utils = require('./lib/utils')

const runTest = utils.createTestRunner(__filename)

const pkg = require('../package.json')

// Check the package name.
runTest(function testPackageName (t) {
  t.deepEqual(pkg.name, 'moar-profile-viewer', 'checking package name')
  t.end()
})
