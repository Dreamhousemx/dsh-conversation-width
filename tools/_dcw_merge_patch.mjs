/**
 * Build a UNION of the live profile patch and the pre-wipe backup, then validate
 * the result with the market's OWN patch reader.
 *
 * Why a union and not the market's wholesale "restore": the live patch has moved
 * on since the wipe in two ways worth keeping - `agency-agents` (a row the backup
 * has never seen) and the workbuddy runtime cache. The backup is the only place
 * that still holds the 30+ provider/model rows, `permission`, `ui-conversation`,
 * `ui-theme` and `ui-usage-billing`. Union recovers everything and reverts nothing.
 *
 * Writes only to `<live>.dcw-merged`; the live file is not touched here.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import env from './dsh-env.cjs';

const PROFILE = env.profileDir();
const LIVE = join(PROFILE, 'cordis.patch.yml');
// The pre-wipe backup to union in: pass the stamp of your own <patch>.bak-<epoch ms>.
const BACKUP = env.required('DSH_WIPE_BACKUP', 'Path to the <patch>.bak-<epoch ms> file to union in');
const OUT = join(PROFILE, 'cordis.patch.yml.dcw-merged');

/** Split a loader patch into its leading comment header and its top-level `- ` entries. */
function splitBlocks(path) {
	const lines = readFileSync(path, 'utf8').split(/\r?\n/);
	const header = [];
	const blocks = [];
	const strays = [];
	let cur = null;
	for (const line of lines) {
		if (/^- /.test(line)) {
			cur = [line];
			blocks.push(cur);
		} else if (/^#/.test(line)) {
			if (cur === null) header.push(line);
			else cur.push(line);
		} else if (line.trim() === '') {
			if (cur !== null) cur.push(line);
		} else {
			strays.push(line);
			if (cur !== null) cur.push(line);
		}
	}
	return { header, blocks, strays };
}
function idOf(block) {
	const m = /^- id:\s*(\S+)/.exec(block[0]);
	return m === null ? null : m[1];
}
function render(header, blocks) {
	const body = blocks.map((b) => b.join('\n').replace(/\n+$/u, '')).join('\n');
	return header.join('\n') + '\n' + body + '\n';
}

const live = splitBlocks(LIVE);
const bak = splitBlocks(BACKUP);
console.log('strays live=' + live.strays.length + ' ' + JSON.stringify(live.strays.slice(0, 4)));
console.log('strays backup=' + bak.strays.length + ' ' + JSON.stringify(bak.strays.slice(0, 4)));
console.log('header live=' + JSON.stringify(live.header));
console.log('header backup=' + JSON.stringify(bak.header));

const liveBlocks = live.blocks;
const liveById = new Map();
for (const b of liveBlocks) {
	const id = idOf(b);
	if (id !== null) liveById.set(id, b);
}
const bakIds = new Set(bak.blocks.map(idOf).filter((x) => x !== null));

// Backup order first (it is the fuller, user-curated ordering); a live row that
// also exists in the backup wins, because the live file is the newer intent.
const out = [];
const placed = new Set();
for (const b of bak.blocks) {
	const id = idOf(b);
	if (id !== null && liveById.has(id)) {
		out.push(liveById.get(id));
		placed.add(id);
	} else {
		out.push(b);
		if (id !== null) placed.add(id);
	}
}
for (const b of liveBlocks) {
	const id = idOf(b);
	if (id !== null && placed.has(id)) continue;
	if (id !== null && bakIds.has(id)) continue;
	out.push(b);
	if (id !== null) placed.add(id);
}

const merged = render(bak.header.length > 0 ? bak.header : live.header, out);
writeFileSync(OUT, merged, 'utf8');

const idsOut = new Set(out.map(idOf).filter((x) => x !== null));
const idsBak = new Set(bak.blocks.map(idOf).filter((x) => x !== null));
const idsLive = new Set(liveBlocks.map(idOf).filter((x) => x !== null));
const missing = [...idsBak].filter((x) => !idsOut.has(x));
console.log('--- sizes ---');
console.log('live=' + statSync(LIVE).size + '  backup=' + statSync(BACKUP).size + '  merged=' + statSync(OUT).size);
console.log('--- top-level row counts ---');
console.log('live=' + liveBlocks.length + ' (' + idsLive.size + ' ids)  backup=' + bak.blocks.length + ' (' + idsBak.size + ' ids)  merged=' + out.length + ' (' + idsOut.size + ' ids)');
console.log('backup ids missing from merged: ' + JSON.stringify(missing));
console.log('live ids missing from merged: ' + JSON.stringify([...idsLive].filter((x) => !idsOut.has(x))));
console.log('merged-only ids: ' + JSON.stringify([...idsOut].filter((x) => !idsBak.has(x) && !idsLive.has(x))));

console.log('--- top-level id sets ---');
console.log('backup: ' + JSON.stringify([...idsBak].sort()));
console.log('live  : ' + JSON.stringify([...idsLive].sort()));
console.log('backup-only: ' + JSON.stringify([...idsBak].filter((x) => !idsLive.has(x)).sort()));
console.log('live-only  : ' + JSON.stringify([...idsLive].filter((x) => !idsBak.has(x)).sort()));

// The dash form (`- id: x`) is how a nested registry lists its entries - the
// model catalogue lives there. Compare it separately from the top-level blocks.
const dashRx = /^[ \t]*-[ \t]+id:[ \t]*(\S+)/gmu;
const dash = (p) => new Set([...readFileSync(p, 'utf8').matchAll(dashRx)].map((m) => m[1]));
const dBak = dash(BACKUP);
const dLive = dash(LIVE);
const dOut = dash(OUT);
console.log('--- dash-form id sets (top-level + nested) ---');
console.log('unique: backup=' + dBak.size + ' live=' + dLive.size + ' merged=' + dOut.size);
console.log('ONLY IN BACKUP (' + [...dBak].filter((x) => !dLive.has(x)).length + '): ' + JSON.stringify([...dBak].filter((x) => !dLive.has(x)).sort()));
console.log('ONLY IN LIVE (' + [...dLive].filter((x) => !dBak.has(x)).length + '): ' + JSON.stringify([...dLive].filter((x) => !dBak.has(x)).sort()));
console.log('backup dash-ids missing from merged: ' + JSON.stringify([...dBak].filter((x) => !dOut.has(x)).sort()));

// --- validate with the market's own reader (same YAML machinery the host uses)
const mod = await import(pathToFileURL(join(PROFILE, 'node_modules', 'dshmarket', 'lib', 'patch.js')).href);
const reader = mod.readUserPatchState ?? mod.default?.readUserPatchState;
const asSet = (v) => new Set(v ?? []);
const report = {};
for (const [label, p] of [['live', LIVE], ['backup', BACKUP], ['merged', OUT]]) {
	try {
		const st = reader(p);
		const forced = asSet(st.forced);
		report[label] = { forced, inserts: asSet(st.inserts), disables: asSet(st.disables) };
		console.log('PARSE ' + label + ' ok: forced=' + forced.size + ' inserts=' + report[label].inserts.size + ' disables=' + report[label].disables.size);
	} catch (e) {
		console.log('PARSE ' + label + ' FAILED: ' + e.message);
	}
}
if (report.merged && report.backup) {
	const lost = [...report.backup.forced].filter((x) => !report.merged.forced.has(x));
	const bytesOk = statSync(OUT).size >= statSync(BACKUP).size;
	console.log('--- market-equivalent offerRestore check ---');
	console.log('lostRowIds(backup vs merged) = ' + JSON.stringify(lost));
	console.log('currentBytes < newest.bytes ? ' + !bytesOk + '  (merged=' + statSync(OUT).size + ', newest=' + statSync(BACKUP).size + ')');
	console.log('=> offerRestore would be ' + (lost.length > 0 && !bytesOk));
}
