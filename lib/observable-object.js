'use strict'

exports.create = create

// Observable Objects are objects which contain properties for which you can
// observe changes.
//
// To create an ObservableObject, use:
//     observableObject = ObservableObject.create()
//
// To set values of properties in an ObservableObject, use
//     observableObject.set({key1: val1, key2: val2})
//
// To get values of properties in an ObservableObject, use
//     observableObject.get()
//     observableObject.get({key1: defVal1, key2: devVal2})
//
// The first form returns all the properties in a new object.  The second
// form returns the object passed in, with any requested properties values
// reset, if they are in the observable object.
//
// To be notified of changes to properties of an ObservableObject, use
//     observableObject.on({key1: fn(newV, oldV), key2: fn(newV, oldV)})
//
// The notification functions will be passed the new and old values.

const EventEmitter = require('events')

function create () {
  return new ObservableObject()
}

class ObservableObject {
  constructor () {
    this._props = {}
    this._events = new EventEmitter()
  }

  // get the values of the properties
  get (values) {
    // no args, return shallow copy of state
    if (values == null) {
      return Object.assign({}, this._props)
    }

    // otherwise, fill in values for the object passed in
    for (let key in values) {
      if (this._props.hasOwnProperty(key)) {
        values[key] = this._props[key]
      }
    }

    return values
  }

  // set the values of the properties
  set (values) {
    const oldValues = new Map()
    for (let key in values) {
      if (this._props[key] === values[key]) continue

      oldValues.set(key, this._props[key])
      this._props[key] = values[key]
    }

    for (let key of oldValues.keys()) {
      this._events.emit(key, values[key], oldValues.get(key))
    }
  }

  // set handlers for property changes
  on (handlers) {
    for (let key in handlers) {
      this._events.on(key, handlers[key])
    }

    const self = this
    return function revoker () {
      for (let key in handlers) {
        self._events.removeListener(key, handlers[key])
      }
    }
  }
}
