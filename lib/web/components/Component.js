'use strict'

const React = require('react')

const utils = require('../utils')

module.exports = class Component extends React.Component {
  constructor (props) {
    super(props)
    utils.bindMethods(this, /^handle/)
  }
}
