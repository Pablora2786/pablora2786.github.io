#!/usr/bin/env node
/**
 * Build public/holders/<TICK>.json via Sui GraphQL.
 * Address-owned Movescriptions count toward the leaderboard.
 * ObjectOwner / Shared owners are treated as market/escrow and reported separately.
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
const PAGE = Number(process.env.HOLDERS_PAGE_SIZE || 50);
const ONLY = (process.env.HOLDERS_TICKS || 'SUIS,MOVE,IKUN,GAME,SUIZ')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const MAX_PAGES = Number(process.env.HOLDERS_MAX_PAGES || 0); // 0 = unlimited

const QUERY = `query($cursor: String) {
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

async function gql(variables, tries = 8) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(GQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: QUERY, variables }),
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** i));
        continue;
      }
      const json = await res.json();
      if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
      return json.data;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw last;
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

async function main() {
  mkdirSync(OUT, { recursive: true });
  const supply = loadSupply();
  /** @type {Record<string, { holders: Map<string,{amount:bigint,objects:number}>, market: {amount:bigint,objects:number}, objects:number }>} */
  const byTick = Object.create(null);
  for (const t of ONLY) {
    byTick[t] = {
      holders: new Map(),
      market: { amount: 0n, objects: 0 },
      objects: 0,
    };
  }

  let cursor = null;
  let pages = 0;
  let scanned = 0;
  const t0 = Date.now();
  for (;;) {
    const data = await gql({ cursor });
    const conn = data.objects;
    for (const node of conn.nodes || []) {
      scanned++;
      const json = node?.asMoveObject?.contents?.json;
      if (!json?.tick) continue;
      const tick = String(json.tick).toUpperCase();
      if (!byTick[tick]) continue;
      const amount = BigInt(json.amount || 0);
      byTick[tick].objects++;
      const ownerType = node.owner?.__typename;
      if (ownerType === 'AddressOwner') {
        const addr = node.owner.address?.address;
        if (!addr) continue;
        const cur = byTick[tick].holders.get(addr) || { amount: 0n, objects: 0 };
        cur.amount += amount;
        cur.objects += 1;
        byTick[tick].holders.set(addr, cur);
      } else {
        // ObjectOwner / Shared / Immutable → marketplace escrow or protocol-held
        byTick[tick].market.amount += amount;
        byTick[tick].market.objects += 1;
      }
    }
    pages++;
    if (pages % 20 === 0) {
      const suis = byTick.SUIS;
      console.error(
        JSON.stringify({
          pages,
          scanned,
          elapsedSec: Math.round((Date.now() - t0) / 1000),
          suisHolders: suis?.holders.size || 0,
          suisObjs: suis?.objects || 0,
        }),
      );
    }
    if (!conn.pageInfo.hasNextPage) break;
    if (MAX_PAGES && pages >= MAX_PAGES) break;
    cursor = conn.pageInfo.endCursor;
    // gentle pacing
      }

  const updatedAt = new Date().toISOString();
  const summary = {};
  for (const tick of ONLY) {
    const bucket = byTick[tick];
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
    summary[tick] = {
      holders: rows.length,
      objects: bucket.objects,
      marketObjects: bucket.market.objects,
      top3: rows.slice(0, 3).map((r) => ({ address: r.address, amount: r.amount })),
    };
    console.log('WROTE', tick, 'holders', rows.length);
  }
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify({ updatedAt, scanned, pages, ticks: summary }, null, 2));
  console.log('DONE', JSON.stringify({ scanned, pages, elapsedSec: Math.round((Date.now() - t0) / 1000) }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
