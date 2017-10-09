'use strict'

const utils = require('./lib/utils')

const runTest = utils.createTestRunner(__filename)

const fs = require('fs')
const path = require('path')
const hljs = require('highlight.js')
const hljsExt = require('../lib/web/hljs-ext')

runTest(function testHljsExt (t) {
  const sourceFile = path.join(__dirname, 'fixtures', 'to-highlight.js')
  const outFile = path.join(__dirname, '..', 'tmp', 'to-hightlight.html')

  const source = fs.readFileSync(sourceFile, 'utf8')
  const hl = hljs.highlight('js', source, true)
  hljsExt.extend(hl)

  const style1 = `<style>background-color: #F7F7F7</style>`
  const style2 = `<link href="../css/hljs.less" rel="stylesheet">`
  const html = `${style1}\n${style2}<table class="hljs-file">\n${hl.value}\n</table>`
  fs.writeFileSync(outFile, html)
  console.log(`generated ${path.relative(process.cwd(), outFile)}`)
  t.end()
})
