import { execSync } from 'child_process'

// https://nodejs.org/api/process.html#process_process_arch
type NodeJSArch =
  | 'arm'
  | 'arm64'
  | 'ia32'
  | 'mips'
  | 'mipsel'
  | 'ppc'
  | 'ppc64'
  | 'riscv64'
  | 's390'
  | 's390x'
  | 'x32'
  | 'x64'
  | 'universal'
  | 'wasm32'

const CpuToNodeArch: { [index: string]: NodeJSArch } = {
  x86_64: 'x64',
  aarch64: 'arm64',
  i686: 'ia32',
  armv7: 'arm',
  riscv64gc: 'riscv64',
}

export const NodeArchToCpu: { [index: string]: string } = {
  x64: 'x86_64',
  arm64: 'aarch64',
  ia32: 'i686',
  arm: 'armv7',
  riscv64: 'riscv64gc',
}

const SysToNodePlatform: { [index: string]: NodeJS.Platform } = {
  linux: 'linux',
  freebsd: 'freebsd',
  darwin: 'darwin',
  windows: 'win32',
}

export const UniArchsByPlatform: Record<string, NodeJSArch[]> = {
  darwin: ['x64', 'arm64'],
}

export interface PlatformDetail {
  platform: NodeJS.Platform | 'wasi'
  platformArchABI: string
  arch: NodeJSArch
  raw: string
  abi: string | null
}

export const DefaultPlatforms: PlatformDetail[] = [
  {
    platform: 'win32',
    arch: 'x64',
    abi: 'msvc',
    platformArchABI: 'win32-x64-msvc',
    raw: 'x86_64-pc-windows-msvc',
  },
  {
    platform: 'darwin',
    arch: 'x64',
    abi: null,
    platformArchABI: 'darwin-x64',
    raw: 'x86_64-apple-darwin',
  },
  {
    platform: 'linux',
    arch: 'x64',
    abi: 'gnu',
    platformArchABI: 'linux-x64-gnu',
    raw: 'x86_64-unknown-linux-gnu',
  },
]

/**
 * A triple is a specific format for specifying a target architecture.
 * Triples may be referred to as a target triple which is the architecture for the artifact produced, and the host triple which is the architecture that the compiler is running on.
 * The general format of the triple is `<arch><sub>-<vendor>-<sys>-<abi>` where:
 *   - `arch` = The base CPU architecture, for example `x86_64`, `i686`, `arm`, `thumb`, `mips`, etc.
 *   - `sub` = The CPU sub-architecture, for example `arm` has `v7`, `v7s`, `v5te`, etc.
 *   - `vendor` = The vendor, for example `unknown`, `apple`, `pc`, `nvidia`, etc.
 *   - `sys` = The system name, for example `linux`, `windows`, `darwin`, etc. none is typically used for bare-metal without an OS.
 *   - `abi` = The ABI, for example `gnu`, `android`, `eabi`, etc.
 */
export function parseTriple(rawTriple: string): PlatformDetail {
  const triple = rawTriple.endsWith('eabi')
    ? `${rawTriple.slice(0, -4)}-eabi`
    : rawTriple
  const triples = triple.split('-')
  let cpu: string
  let sys: string
  let abi: string | null = null
  if (triples.length === 4) {
    ;[cpu, , sys, abi = null] = triples
  } else if (triples.length === 3) {
    ;[cpu, , sys] = triples
  } else {
    ;[cpu, sys] = triples
  }
  const platformName = SysToNodePlatform[sys] ?? sys
  const arch = CpuToNodeArch[cpu] ?? cpu
  return {
    platform: platformName,
    arch,
    abi,
    platformArchABI: abi
      ? `${platformName}-${arch}-${abi}`
      : `${platformName}-${arch}`,
    raw: rawTriple,
  }
}

export function getHostTargetTriple(): PlatformDetail {
  const host = execSync(`rustc -vV`, {
    env: process.env,
  })
    .toString('utf8')
    .split('\n')
    .find((line) => line.startsWith('host: '))
  const triple = host?.slice('host: '.length)
  if (!triple) {
    throw new TypeError(`Can not parse target triple from host`)
  }
  return parseTriple(triple)
}
