'use strict'

// const graphvizObjects = require('graphviz-objects')

exports.create = create

const path = require('path')

// Create a new CallGraph.
function create (profile) {
  return new CallGraph(profile)
}

// Models a CallGraph
class CallGraph {
  constructor (profile) {
    this.profile = profile
  }

  // Return GraphViz notation for a callgraph.
  generateGraphviz () {
    const profile = this.profile
    const out = []

    for (let node of profile.nodes) {
      if (node.isProgram) profile.totalTime -= node.selfTime
      if (node.isIdle) profile.totalTime -= node.selfTime
      if (node.isGC) profile.totalTime -= node.selfTime
    }

    out.push('digraph g {')
    out.push('    graph [')
    out.push('        rankdir = "LR"')
    out.push('    ];')

    for (let script of profile.scripts) {
      if (script.pkg.name === '(unknown)') {
        script.name = path.basename(script.url)
        continue
      }

      if (script.pkg.name[0] === '(') {
        script.name = script.url
        continue
      }

      script.name = path.relative(script.pkg.url, script.url)
    }

    for (let script of profile.scripts) {
      const callMap = new Map()

      for (let fn of script.fns) {
        for (let node of fn.nodes) {
          for (let child of node.children) {
            if (child.fn.script === node.fn.script) continue
            if (child.fn.script.pkg === node.fn.script.pkg) continue

            const key = `${child.fn.script.pkg.name}:${child.fn.script.name}`
            const val = {
              pkgName: child.fn.script.pkg.name,
              scriptName: child.fn.script.name
            }
            callMap.set(key, val)
          }
        }
      }

      script.calls = Array.from(callMap.values())
    }

    for (let pkg of profile.pkgs) {
      const scripts = pkg.scripts
      scripts.sort((script1, script2) => stringCompare(script1.name, script2.name))

      out.push(`    "${pkg.name}" [`)
      out.push('        shape = "plain"')

      const tdAttrs = 'align="left" border="1"'

      let href = ''
      if (pkg.name[0] !== '(') {
        href = `href="https://npmjs.org/package/${pkg.name}"`
      }

      let packageCpu = 0
      for (let script of pkg.scripts) {
        for (let fn of script.fns) {
          for (let node of fn.nodes) {
            packageCpu += Math.round(node.selfTime)
          }
        }
      }
      packageCpu = Math.round(packageCpu / profile.totalTime)

      const tip = `title="package ${pkg.name} -- ${packageCpu}%"`
      const thAttrs = `${tdAttrs} cellpadding="8" bgcolor="cadetblue1" ${href} ${tip}`

      const label = []
      label.push('<table border="0" cellspacing="0">')
      label.push(`<tr><td ${thAttrs} ><b>${pkg.name}</b></td></tr>`)

      for (let script of scripts) {
        if (script.name === '') continue

        const cpuPercent = getScriptCpuPercent(profile, script)
        const cpuPercent100 = Math.round(cpuPercent * 100)
        const color = `bgcolor="${selfTimeColor(cpuPercent)}"`
        const tip = `title="${cpuPercent100}% -- ${script.url}" href="#"`
        label.push(`<tr><td port="${script.name}" ${tdAttrs} ${color} ${tip}>${script.name}</td></tr>`)
      }
      label.push('</table>')

      out.push(`        label = <${label.join('\n')}>`)
      out.push('    ];')
    }

    for (let pkg of profile.pkgs) {
      for (let script of pkg.scripts) {
        for (let call of script.calls) {
          if (pkg === call.pkg) continue
          const tooltip = `${pkg.name}:${script.name} -> ${call.pkgName}:${call.scriptName}`
          const edge = `"${pkg.name}":"${script.name}" -> "${call.pkgName}":"${call.scriptName}" [tooltip="${tooltip}"];`
          out.push(`    ${edge}`)
        }
      }
    }

    out.push('}')

    return out.join('\n')
  }
}

function getScriptCpuPercent (profile, script) {
  let selfTime = 0
  for (let fn of script.fns) {
    for (let node of fn.nodes) {
      selfTime += node.selfTime
    }
  }

  return selfTime / profile.totalTime
}

// why did I have to write this?
function stringCompare (s1, s2) {
  if (s1 < s2) return -1
  if (s1 > s2) return 1
  return 0
}

const Colors = ['white', 'mistyrose', 'pink', 'hotpink', 'magenta', 'orangered', 'orange']
const ColorsCount = Colors.length

// get color given script
function selfTimeColor (cpuPercent) {
  // 0 < selfTime < 1 ; take sqrt() to bump lower #'s up
  cpuPercent = Math.sqrt(cpuPercent)

  let colorIndex = Math.min(cpuPercent * ColorsCount, ColorsCount - 1)
  colorIndex = Math.round(colorIndex)

  return Colors[colorIndex]
}
