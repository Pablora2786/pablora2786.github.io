#!/usr/bin/env node
/**
 * Build public/holders/<TICK>.json via Sui GraphQL.
 *
 * Live object pagination is pinned to a checkpoint (~1h retention). Long scans
 * hit "outside consistent range". We scan FORWARD and BACKWARD, restarting
 * fresh windows until the time budget or no new objects, then enrich each
 * discovered holder via owner+type filter (fixes undercounted wallets).
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'holders');
const GQL = process.env.SUI_GRAPHQL_URL || 'https://graphql.mainnet.sui.io/graphql';
const TYPE =
  '0x830fe26674dc638af7c3d84030e2575f44a2bdc1baa1f4757cfe010a4b106b6a::movescription::Movescription';
const PAGE = Math.min(50, Number(process.env.HOLDERS_PAGE_SIZE || 50));
const ONLY = (process.env.HOLDERS_TICKS || 'SUIS,DGEN,MOVE,IKUN,GAME,SUIZ')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const CHECKPOINT_EVERY = Number(process.env.HOLDERS_CHECKPOINT_EVERY || 80);
const MAX_SEC = Number(process.env.HOLDERS_MAX_SEC || 0); // 0 = no limit
const MAX_RESTARTS = Number(process.env.HOLDERS_MAX_RESTARTS || 6);
const ENRICH = process.env.HOLDERS_ENRICH !== '0';

function queryForward() {
  return `query($cursor: String) {
  objects(first: ${PAGE}, after: $cursor, filter: { type: "${TYPE}" }) {
    pageInfo { hasNextPage endCursor }
    nodes {
      address
      owner {
        __typename
        ... on AddressOwner { address { address } }
        ... on ObjectOwner { address { address } }
        ... on Shared { initialSharedVersion }
      }
      asMoveObject { contents { json } }
    }
  }
}`;
}

function queryBackward() {
  return `query($cursor: String) {
  objects(last: ${PAGE}, before: $cursor, filter: { type: "${TYPE}" }) {
    pageInfo { hasPreviousPage startCursor }
    nodes {
      address
      owner {
        __typename
        ... on AddressOwner { address { address } }
        ... on ObjectOwner { address { address } }
        ... on Shared { initialSharedVersion }
      }
      asMoveObject { contents { json } }
    }
  }
}`;
}

function queryOwned() {
  return `query($owner: SuiAddress!, $cursor: String) {
  objects(first: ${PAGE}, after: $cursor, filter: { owner: $owner, type: "${TYPE}" }) {
    pageInfo { hasNextPage endCursor }
    nodes {
      address
      owner {
        __typename
        ... on AddressOwner { address { address } }
      }
      asMoveObject { contents { json } }
    }
  }
}`;
}

async function gql(query, variables, tries = 12) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(GQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, Math.min(20000, 500 * 2 ** i)));
        continue;
      }
      const json = await res.json();
      if (json.errors?.length) {
        const msg = json.errors.map((e) => e.message).join('; ');
        const err = new Error(msg);
        err.graphql = true;
        throw err;
      }
      return json.data;
    } catch (e) {
      last = e;
      if (e?.graphql && /outside consistent range|outside the available range/i.test(String(e.message))) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, Math.min(20000, 500 * 2 ** i)));
    }
  }
  throw last;
}

function timedOut(t0) {
  return MAX_SEC > 0 && (Date.now() - t0) / 1000 >= MAX_SEC;
}

function loadSupply() {
  const snapPath = join(ROOT, 'public', 'ticks-snapshot.json');
  const map = {};
  if (existsSync(snapPath)) {
    const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
    for (const t of snap.ticks || []) {
      map[t.tick] = {
        totalSupply: String(t.totalSupply),
        currentSupply: String(t.currentSupply),
        marketId: t.marketId || null,
      };
    }
  }
  return map;
}

function emptyBucket() {
  return { holders: new Map(), market: { amount: 0n, objects: 0 }, objects: 0, seen: new Set() };
}

function ingest(byTick, node) {
  const json = node?.asMoveObject?.contents?.json;
  if (!json?.tick) return false;
  const tick = String(json.tick).toUpperCase();
  const bucket = byTick[tick];
  if (!bucket) return false;
  const oid = node.address;
  if (!oid || bucket.seen.has(oid)) return false;
  bucket.seen.add(oid);
  const amount = BigInt(json.amount || 0);
  bucket.objects++;
  if (node.owner?.__typename === 'AddressOwner') {
    const addr = node.owner.address?.address;
    if (!addr) return true;
    const cur = bucket.holders.get(addr) || { amount: 0n, objects: 0 };
    cur.amount += amount;
    cur.objects += 1;
    bucket.holders.set(addr, cur);
  } else {
    bucket.market.amount += amount;
    bucket.market.objects += 1;
  }
  return true;
}

function writeTickPayload(tick, bucket, supply, updatedAt, meta = {}) {
  const totalSupply = BigInt(supply[tick]?.currentSupply || supply[tick]?.totalSupply || 0);
  const rows = [...bucket.holders.entries()]
    .map(([address, v]) => ({
      address,
      amount: v.amount.toString(),
      objects: v.objects,
      pct: totalSupply > 0n ? Number((v.amount * 10000n) / totalSupply) / 100 : 0,
    }))
    .sort((a, b) => {
      const d = BigInt(b.amount) - BigInt(a.amount);
      return d === 0n ? 0 : d > 0n ? 1 : -1;
    });
  const payload = {
    tick,
    updatedAt,
    timezoneNote: 'Asia/Shanghai (UTC+8)',
    complete: !!meta.complete,
    coverage: meta.coverage || null,
    totalSupply: (supply[tick]?.totalSupply || '0').toString(),
    currentSupply: (supply[tick]?.currentSupply || totalSupply.toString()).toString(),
    scannedObjects: bucket.objects,
    holderCount: rows.length,
    marketEscrow: {
      note: 'Movescription objects owned by marketplace/shared objects (listed for sale), excluded from holder ranks',
      amount: bucket.market.amount.toString(),
      objects: bucket.market.objects,
    },
    holders: rows,
  };
  writeFileSync(join(OUT, `${tick}.json`), JSON.stringify(payload));
  return {
    holders: rows.length,
    objects: bucket.objects,
    marketObjects: bucket.market.objects,
    top3: rows.slice(0, 3).map((r) => ({ address: r.address, amount: r.amount })),
  };
}

async function scanDirectionOnce(byTick, direction, t0) {
  const forward = direction === 'forward';
  const q = forward ? queryForward() : queryBackward();
  let cursor = null;
  let pages = 0;
  let scanned = 0;
  let added = 0;
  let finished = false;
  let rangeExceeded = false;
  try {
    for (;;) {
      if (timedOut(t0)) break;
      const data = await gql(q, { cursor });
      const conn = data.objects;
      for (const node of conn.nodes || []) {
        scanned++;
        if (ingest(byTick, node)) added++;
      }
      pages++;
      if (pages % 20 === 0) {
        console.error(
          JSON.stringify({
            direction,
            pages,
            scanned,
            added,
            elapsedSec: Math.round((Date.now() - t0) / 1000),
            ticks: Object.fromEntries(
              ONLY.map((t) => [t, { holders: byTick[t].holders.size, objs: byTick[t].objects }]),
            ),
          }),
        );
      }
      if (CHECKPOINT_EVERY && pages % CHECKPOINT_EVERY === 0) {
        const updatedAt = new Date().toISOString();
        const supply = loadSupply();
        for (const tick of ONLY) {
          writeTickPayload(tick, byTick[tick], supply, updatedAt, {
            complete: false,
            coverage: { direction, pages, scanned, added },
          });
        }
      }
      if (forward) {
        if (!conn.pageInfo.hasNextPage) {
          finished = true;
          break;
        }
        cursor = conn.pageInfo.endCursor;
      } else {
        if (!conn.pageInfo.hasPreviousPage) {
          finished = true;
          break;
        }
        cursor = conn.pageInfo.startCursor;
      }
    }
  } catch (e) {
    const msg = String(e?.message || e);
    console.error(JSON.stringify({ direction, event: 'stop', message: msg, pages, scanned, added }));
    if (/outside consistent range|outside the available range/i.test(msg)) {
      rangeExceeded = true;
    } else {
      throw e;
    }
  }
  return { finished, pages, scanned, added, rangeExceeded };
}

async function scanWithRestarts(byTick, direction, t0) {
  let total = { finished: false, pages: 0, scanned: 0, added: 0, restarts: 0 };
  for (let i = 0; i < MAX_RESTARTS; i++) {
    if (timedOut(t0)) break;
    const beforeUnique = Object.values(byTick).reduce((n, b) => n + b.seen.size, 0);
    console.error(JSON.stringify({ direction, event: 'start', restart: i }));
    const r = await scanDirectionOnce(byTick, direction, t0);
    total.pages += r.pages;
    total.scanned += r.scanned;
    total.added += r.added;
    total.restarts = i;
    if (r.finished) {
      total.finished = true;
      break;
    }
    const afterUnique = Object.values(byTick).reduce((n, b) => n + b.seen.size, 0);
    const gained = afterUnique - beforeUnique;
    console.error(JSON.stringify({ direction, event: 'restart-check', gained, restart: i }));
    if (!r.rangeExceeded) break;
    if (gained === 0 && i > 0) break;
    // brief pause so a new consistency window can open
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.error(JSON.stringify({ direction, event: 'done', ...total }));
  return total;
}

/** Re-query each discovered holder so missing objects for known addresses are filled in. */
async function enrichHolders(byTick, t0) {
  if (!ENRICH) return { enriched: 0 };
  const q = queryOwned();
  let enriched = 0;
  for (const tick of ONLY) {
    if (timedOut(t0)) break;
    const bucket = byTick[tick];
    const addrs = [...bucket.holders.keys()];
    console.error(JSON.stringify({ event: 'enrich-start', tick, addresses: addrs.length }));
    for (let i = 0; i < addrs.length; i++) {
      if (timedOut(t0)) break;
      const owner = addrs[i];
      let cursor = null;
      let amount = 0n;
      let objects = 0;
      try {
        for (;;) {
          const data = await gql(q, { owner, cursor });
          const conn = data.objects;
          for (const node of conn.nodes || []) {
            const json = node?.asMoveObject?.contents?.json;
            if (!json?.tick || String(json.tick).toUpperCase() !== tick) continue;
            const oid = node.address;
            if (!oid) continue;
            if (!bucket.seen.has(oid)) {
              bucket.seen.add(oid);
              bucket.objects++;
            }
            amount += BigInt(json.amount || 0);
            objects += 1;
          }
          if (!conn.pageInfo.hasNextPage) break;
          cursor = conn.pageInfo.endCursor;
        }
        if (objects > 0) {
          bucket.holders.set(owner, { amount, objects });
          enriched++;
        }
      } catch (e) {
        console.error(JSON.stringify({ event: 'enrich-err', tick, owner, message: String(e?.message || e) }));
      }
      if ((i + 1) % 50 === 0) {
        console.error(
          JSON.stringify({
            event: 'enrich-progress',
            tick,
            done: i + 1,
            total: addrs.length,
            elapsedSec: Math.round((Date.now() - t0) / 1000),
          }),
        );
        const updatedAt = new Date().toISOString();
        const supply = loadSupply();
        writeTickPayload(tick, bucket, supply, updatedAt, { complete: false, coverage: { enrich: true } });
      }
    }
  }
  return { enriched };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const supply = loadSupply();
  const byTick = Object.create(null);
  for (const t of ONLY) byTick[t] = emptyBucket();
  const t0 = Date.now();

  const fwd = await scanWithRestarts(byTick, 'forward', t0);
  {
    const updatedAt = new Date().toISOString();
    for (const tick of ONLY) {
      writeTickPayload(tick, byTick[tick], supply, updatedAt, {
        complete: false,
        coverage: { forward: fwd },
      });
    }
  }
  const back = await scanWithRestarts(byTick, 'backward', t0);
  const enrich = await enrichHolders(byTick, t0);

  const complete = !!(fwd.finished || back.finished);
  const updatedAt = new Date().toISOString();
  const summary = {
    updatedAt,
    coverage: { forward: fwd, backward: back, enrich },
    ticks: {},
  };
  for (const tick of ONLY) {
    const info = writeTickPayload(tick, byTick[tick], supply, updatedAt, {
      complete,
      coverage: { forward: fwd, backward: back, enrich },
    });
    summary.ticks[tick] = info;
    console.log('WROTE', tick, 'holders', info.holders, 'objects', info.objects);
  }
  if (fwd.finished) {
    for (const tick of ONLY) {
      const p = JSON.parse(readFileSync(join(OUT, `${tick}.json`), 'utf8'));
      p.complete = true;
      writeFileSync(join(OUT, `${tick}.json`), JSON.stringify(p));
    }
  }
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(
    'DONE',
    JSON.stringify({
      elapsedSec: Math.round((Date.now() - t0) / 1000),
      forward: fwd,
      backward: back,
      enrich,
      dgen: summary.ticks.DGEN,
      suis: summary.ticks.SUIS,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
