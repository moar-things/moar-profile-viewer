interface Profile {
  meta:         Meta
  nodes:        Node []
  fns:          Fn []
  scripts:      Script []
  pkgs:         Pkg []
  totalTime:    number // microseconds
  totalSamples: number
}

interface Meta {
  arch?:        string  // from node process object
  platform?:    string  // from node process object
  pid?:         number  // from node process object
  execPath?:    string  // from node process object
  mainModule?:  string  // filename of main module
  moarVersion?: string  // semver of version of moar used
}

interface Node {
  fn:             Fn
  line:           number   // line number in script (1-based)
  lines:          Line []
  parent:         Node
  children:       Node []
  selfTime:       number   // microseconds
  totalTime:      number   // microseconds
  isProgram:      boolean
  isIdle:         boolean
  isGC:           boolean
}

interface Line {
  line:     number // line number in script (1-based)
  selfTime: number // microseconds
}

interface Fn {
  script:   Script
  nodes:    Node []
  name:     string
  line:     number
}

interface Script {
  pkg:      Pkg
  fns:      Fn []
  url:      string
  urlInPkg: string
}

interface Pkg {
  name:         string // may be (system) or (unknown)
  url:          string // may be (system) or (unknown)
  description?: string // from package.json
  homepage?:    string // from package.json
  version?:     string // from package.json
  scripts:      Script []
  dependencies: Dependency []
}


interface Dependency {
  name:    string
  version: string // version range
  type:    string // prod, dev, optional, peer, ...
  pkg?:    Pkg    // resolved package
}
