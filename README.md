# dsh-conversation-width

A DSH Web plugin that adds **对话显示区域宽度** (Conversation display width) to
设置 → 通用 (Settings → General).

The middle conversation column is capped at 920px on a fresh install, which
reads as cramped on a wide monitor. This row exposes the column's real
preference so the width can be set explicitly instead of only by dragging the
conversation's edges.

## What it does

The Conversation package already owns a width preference:

```
localStorage["dsh.conversation.contentWidth"]   // px, written by the drag handles
```

and publishes it as the single authoritative CSS variable:

```css
--dsh-chat-content-width: var(--dsh-chat-user-width,
    clamp(680px, calc(var(--dsh-conversation-column-width, 0px) * .64), 920px));
```

This plugin does **not** introduce a second width system. It is a settings-page
twin of the existing drag handles: it reads and writes the same key, so the two
controls always agree, and the Conversation's own clamp
`[640, columnWidth - 176]` still applies on top of whatever is stored. An
out-of-range value is corrected by the layout rather than breaking the page.

### Controls

| Control | Behaviour |
| --- | --- |
| Slider | `640`–`1600px`, 20px steps, applies live |
| Number box | Same range; ignores the transient empty/partial draft mid-typing |
| `920` / `1100` / `1280` | One-click presets |
| 恢复自适应 | Removes the stored key, returning to `clamp(680, column * .64, 920)` |

### Why 1600px is the ceiling

The range runs to 1600px because past roughly 1100–1300px a single line of
prose stops being comfortably readable — the eye loses the line return — so the
useful part of the range is well inside it. 1600 leaves headroom for unusually
wide displays and for users who prefer a broad column, while the layout's own
`columnWidth - 176` clamp remains the hard ceiling on any given window.

## Install

Link the package into a DSH profile and add it to the profile's bundle list.

1. Clone this repository somewhere stable, then register it as a local package in
   the profile's `package.json` (`<userData>/.dsh/profiles/<profile>/package.json`):

   ```jsonc
   "dependencies": {
     "dsh-conversation-width": "link:/absolute/path/to/dsh-conversation-width"
   },
   "dsh": {
     "profile": {
       "bundles": [ /* … */, "dsh-conversation-width" ]
     }
   }
   ```

2. Make `node_modules/dsh-conversation-width` resolve to that directory — a
   junction on Windows, a symlink elsewhere:

   ```powershell
   New-Item -ItemType Junction `
     -Path "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-conversation-width" `
     -Target "D:\path\to\dsh-conversation-width"
   ```

   Because it is a link rather than a copy, edits here are live after a host
   restart.

**A host restart is required** — the client module graph is composed from the
Loader's entry list at startup, so a newly added plugin row is only scanned then.
This is not the client-plugin HMR path (that needs `pnpm run dev:web` against a
DSH source checkout). A running host is also why a reload alone will not pick the
row up: the host snapshots the client bundle list when it starts.


## Uninstall

Removing the row is additive-reversible — every trace goes with it:

1. Delete the `dsh-conversation-width` entry from `dependencies` and from
   `dsh.profile.bundles` in the profile `package.json`.
2. Delete the `node_modules/dsh-conversation-width` junction.
3. Restart the host.

The stored `localStorage` key is harmless if left behind: with the plugin gone
nothing writes it, and the drag handles keep honouring it.

## Layout

| Path | Role |
| --- | --- |
| `lib/index.js` | Node half. Empty by design: every control is browser-side. |
| `lib/client.js` | The row, its CSS, and its dictionaries. |
| `cordis.patch.yml` | Bundle patch inserting the profile plugin row. |
| `tools/` | Standalone diagnostics used while building this. See below. |

`dsh.client.platform: "web"` marks this as a web-facing client plugin;
`exports["./client"]` is the bundle the host serves at
`/plugins/dsh-conversation-width/client.js`.

## Tools

`tools/` holds the throwaway harnesses written while building the plugin. They
are kept because each one answers a question that is otherwise hard to settle
offline, and they run against an installed DSH rather than a source checkout.

Two environment variables point them at your installation; nothing is hardcoded.
`app.asar` is a single archive, so the scripts that read it must run under the
Electron binary in Node mode:

```powershell
$env:DSH_ASAR        = "<install>/resources/app.asar"
$env:DSH_PROFILE_DIR = "$env:USERPROFILE\.dsh\profiles\desktop"
$env:ELECTRON_RUN_AS_NODE = "1"

& "<install>/DeepSeek Harness.exe" tools\_dcw_probe_host.cjs
```

| Tool | Question it answers |
| --- | --- |
| `_dcw_probe_host.cjs` / `_dcw_range.cjs` | What is actually inside `app.asar` — listed, and read by line range. |
| `_dcw_probe_width.cjs` | Which CSS variable and clamp own the column width, and who writes it. |
| `_dcw_probe_slot.cjs` | Does `settings.general.item` exist, and in what order do rows land? |
| `_dcw_probe_pnpm.cjs` | How does the profile resolve linked local packages? |
| `_dcw_yaml_check.cjs` | Does the bundled YAML parser accept `cordis.patch.yml`? |
| `_dcw_test_client.cjs` | Runs the real bundle factory against a minimal DOM and a shimmed `react`, then inspects the returned tree. |
| `_dcw_test_host.mjs` | Imports the Node half the way the host loader does, proving it cannot break startup. |
| `_dcw_verify_state.mjs` | Asserts the installed state: bundle registered, junction live, no duplicate resolution. |
| `_dcw_apply_restore.mjs`, `_dcw_merge_patch.mjs` | Patch `cordis.patch.yml` and restore it from a backup without losing unrelated entries. |
| `_dcw_make_buggy.cjs` | Rebuilds the original broken CSS-injection block into `.scratch/`, so the harness can be shown to actually catch the defect it exists to catch. |
| `_dcw_show.cjs` | Dumps a file region by line range. |

The last one deserves emphasis: a harness that only ever passes proves nothing.
`_dcw_make_buggy.cjs` reproduces the real defect — a selector built by string
concatenation around `JSON.stringify`, which yields `style[data-plugin-css=""
…""]` and makes `querySelector` throw `SyntaxError: … is not a valid selector` at
module top level — and `_dcw_test_client.cjs` fails on that copy and passes on
the real one.


## Notes

- The row registers into the `settings.general.item` slot with `order: 20`,
  placing it after the built-in developer-tools row and before Current version.
- Copy lives in the plugin's own `conversation-width` locale namespace, per the
  convention that each registrant owns its row copy.
- Changing the preference dispatches a `window` `resize` event. The Conversation
  publishes `--dsh-chat-user-width` from a `ResizeObserver`, which does not fire
  on a preference-only change, and a same-origin `storage` event is not
  delivered to the writing document — so this is the cheapest signal the layout
  already observes.
