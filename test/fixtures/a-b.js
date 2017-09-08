'use strict'

const shelljs = require('shelljs')
const arcParse = require('@architect/parser')

setInterval(run, 1000)

function run () {
  a()
}

function a () {
  console.log(new Date(), 'a()')
  wait(300)
  b()
  wait(300)
}

function b () {
  console.log(new Date(), 'b()')
  wait(300)
}

function wait (ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    shelljs.ls('*')
    arcParse('# this is a comment\n@section\nvalue')
  }
}
