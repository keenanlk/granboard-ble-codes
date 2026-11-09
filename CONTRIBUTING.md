# Contributing

Thanks for helping map the GranBoard protocol. This repo has three parts, and each one takes a different kind of contribution:

| Part | Where | What helps most |
|---|---|---|
| Protocol reference | [`README.md`](README.md) | New or corrected hit codes, LED command behavior, results from other board models |
| `granboard` npm package | [`packages/granboard`](packages/granboard) | Bug fixes, tests, new protocol features, better transports |
| Demo and examples | [`demo`](demo), [`examples`](examples) | Fixes, new stacks, and confirming that an example works on real hardware |

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting protocol findings

Protocol findings are the most valuable contributions, and you don't need to write code to make one.

- **Unknown hit code**: `decodeHit` returned `null`, or the demo showed "Unknown code". Open a [protocol finding](https://github.com/keenanlk/granboard-ble-codes/issues/new?template=protocol_finding.yml) with the raw code (for example `51-46-52-64`), where the dart landed, and your board model.
- **LED command behavior**: what you wrote (the bytes) and what the board did.
- **Another board model**: whether hits and LEDs behave the same as on the GranBoard 3s.

To capture codes, use `client.onUnknown(({ code }) => console.log(code))` in the package, or connect in the [live demo](https://keenanlk.github.io/granboard-ble-codes/), which shows any unknown code it receives.

Please only share codes you captured from your own board. Don't paste code or assets from the official GranBoard app.

## Development setup

You need Node.js 20 or newer. Each folder is its own npm project with its own lockfile, so there's no workspace install.

```bash
# the package
cd packages/granboard
npm ci
npm run typecheck && npm test && npm run build && npm run docs

# the demo (it builds against the package source in this repo)
cd demo
npm ci
npm run dev
```

The examples are listed in the [root README](README.md#examples), and each one has a README with its own commands. The Python, Rust and Swift examples need their own toolchains.

## Pull requests

1. **Open an issue first** for anything bigger than a small fix, so we can agree on the approach.
2. **Branch from `main`** and keep each PR to one change.
3. **Title the PR as a [Conventional Commit](https://www.conventionalcommits.org/)**, for example `feat: decode the new button code` or `fix(package): queue writes after reconnect`. PRs are squash-merged, so the title becomes the commit message. CI checks the format. Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`.
4. **Make CI pass.** It runs the package's type-check, tests, build and docs build, the demo build, and builds or type-checks every example.
5. **Fill in the PR template**, and say plainly whether you tested on a real board. "Untested on hardware" is fine; just say so.

### Package rules

- **Tests**: add or update tests in `packages/granboard/test` for any behavior change.
- **Docs**: every export needs a TSDoc comment. `npm run docs` fails on undocumented exports and broken `{@link}`s, and CI runs it.
- **Protocol sync**: if you change a code table or command layout, update the matching section of the root `README.md` in the same PR.
- **No runtime dependencies.** The package ships with zero, so please keep it that way.
- **No breaking API changes** without an issue first. The package follows [semver](https://semver.org/).

### Example rules

- JavaScript examples depend on `granboard` from npm (`^x.y.z`), not a relative path.
- Keep each example small and focused on one stack.
- Mark any Bluetooth path that hasn't run on a real board as untested in the example's README.

## Releases

Maintainers bump the package version and publish to npm. You don't need to change `version` in your PR.

## Questions

Open an issue. For security problems, follow [SECURITY.md](SECURITY.md) instead of filing a public issue.
