'use strict'

const utils = require('./lib/utils')

const runTest = utils.createTestRunner(__filename)

const ObservableObject = require('../lib/observable-object')

runTest(function test (t) {
  const oo = ObservableObject.create()

  // get property values, using defaults if property not available
  const values1 = oo.get({a: 1, b: 2})
  t.equal(values1.a, 1, 'values1.a should be 1')
  t.equal(values1.b, 2, 'values1.b should be 2')

  // test setting, firing events, and getting
  let newA, newB
  let oldA, oldB

  const revokeOn = oo.on({
    a: (n, o) => { newA = n; oldA = o },
    b: (n, o) => { newB = n; oldB = o }
  })

  oo.set({a: 3, b: 4})

  t.equal(oldA, undefined, 'oldA should be undefined')
  t.equal(oldB, undefined, 'oldB should be undefined')
  t.equal(newA, 3, 'newA should be 3')
  t.equal(newB, 4, 'newB should be 4')

  const values2 = oo.get()
  const values3 = oo.get({a: 1, b: 2})

  t.equal(values2.a, 3, 'values2.a should be 3')
  t.equal(values2.b, 4, 'values2.b should be 4')
  t.equal(values3.a, 3, 'values3.a should be 3')
  t.equal(values3.b, 4, 'values3.b should be 4')

  oo.set({a: 5, b: 6})

  t.equal(oldA, 3, 'oldA should be 3')
  t.equal(oldB, 4, 'oldB should be 4')
  t.equal(newA, 5, 'newA should be 5')
  t.equal(newB, 6, 'newB should be 6')

  revokeOn()

  oo.set({a: 7, b: 8})

  t.equal(oldA, 3, 'oldA should be 3')
  t.equal(oldB, 4, 'oldB should be 4')
  t.equal(newA, 5, 'newA should be 5')
  t.equal(newB, 6, 'newB should be 6')

  const values4 = oo.get()
  const values5 = oo.get({a: 1, b: 2})

  t.equal(values4.a, 7, 'values4.a should be 7')
  t.equal(values4.b, 8, 'values4.b should be 8')
  t.equal(values5.a, 7, 'values5.a should be 8')
  t.equal(values5.b, 8, 'values5.b should be 8')

  t.end()
})
