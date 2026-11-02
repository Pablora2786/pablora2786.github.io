import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { writeFileSync } from 'fs';

const RPC = 'https://mainnet.suiet.app';
const client = new SuiJsonRpcClient({ url: RPC, network: 'mainnet' });
const SENDER = '0x87d55d66c168e8acec2ffab46bf356d99319b3c9d6dda8fee670e8e3ee62cbeb';
const CALL_PKG = '0x88a632719f065fae7509d335584e8ef9ea3cb528c77bb8d325835303d36c382e';
const MARKET_PKG = '0x6db09c0709c91d743502e27f06a2352f62c1459c3c1ca9d1b3ee4a110e3f8ea0';
const DEPLOY_RECORD = '0x8fb949a8ae112ee025401cdb6dcdcfe04a8817bc2912a778a875e6b3697715da';
const CLOCK = '0x6';
const SUIS_MKT = '0x20aac987cf2e33b56d4f883724e19c0b986f6b56c07ee9588c8f3cebaecc6c9b';
const SUIS_RECORD = '0x741bc9ead6975306abeb47036f17012ea651048241f677057fcb462efedc462d';
const TROLL_RECORD = '0x1167ec330fab874e12a8d6e5b4476e54085f178c248ef2f51aadb7abd611c268';
const SUIS_OBJ = '0x004c506969297b706e33347b88b00e57b79ab0e8bc5a03b38f0cc824591d0e4b';

async function run(name, build) {
  try {
    const tx = build();
    tx.setSender(SENDER);
    const bytes = await tx.build({ client });
    const r = await client.dryRunTransactionBlock({ transactionBlock: bytes });
    const out = {
      name,
      status: r.effects?.status?.status,
      error: r.effects?.status?.error || null,
      gasUsed: r.effects?.gasUsed || null,
    };
    console.log(JSON.stringify(out));
    return out;
  } catch (e) {
    const out = { name, status: 'exception', error: e?.message || String(e) };
    console.log(JSON.stringify(out));
    return out;
  }
}

const results = [];

results.push(await run('transfer_self', () => {
  const tx = new Transaction();
  tx.transferObjects([tx.object(SUIS_OBJ)], SENDER);
  return tx;
}));

results.push(await run('list_suis', () => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${MARKET_PKG}::market::list`,
    arguments: [tx.object(SUIS_MKT), tx.object(SUIS_OBJ), tx.pure.u64(999999999000)],
  });
  return tx;
}));

const floorTx = new Transaction();
floorTx.moveCall({
  target: `${MARKET_PKG}::market::floor_listing`,
  arguments: [floorTx.object(SUIS_MKT), floorTx.pure.u64(0), floorTx.pure.u64(1)],
});
const floor = await client.devInspectTransactionBlock({ sender: SENDER, transactionBlock: floorTx });
const ev = floor.events?.find((e) => e.type.includes('FloorPriceEvent'))?.parsedJson;
const listing = ev ? {
  id: ev.object_id[0],
  unit: ev.unit_price[0],
  price: ev.price[0],
  amt: ev.amt[0],
} : null;
console.log(JSON.stringify({ name: 'floor_sample', listing }));

if (listing) {
  results.push(await run('buy_floor', () => {
    const tx = new Transaction();
    const [paid] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(listing.price))]);
    const got = tx.moveCall({
      target: `${MARKET_PKG}::market::buy`,
      arguments: [
        tx.object(SUIS_MKT),
        tx.pure.id(listing.id),
        paid,
        tx.pure.u64(BigInt(listing.unit)),
        tx.object(CLOCK),
      ],
    });
    tx.transferObjects([got], SENDER);
    return tx;
  }));
}

results.push(await run('mint_suis_closed', () => {
  const tx = new Transaction();
  const [c] = tx.splitCoins(tx.gas, [tx.pure.u64(100000000n)]);
  tx.moveCall({
    target: `${CALL_PKG}::epoch_bus_factory::mint`,
    arguments: [tx.object(SUIS_RECORD), c, tx.object(CLOCK)],
  });
  return tx;
}));

results.push(await run('mint_troll_open', () => {
  const tx = new Transaction();
  const [c] = tx.splitCoins(tx.gas, [tx.pure.u64(100000000n)]);
  tx.moveCall({
    target: `${CALL_PKG}::epoch_bus_factory::mint`,
    arguments: [tx.object(TROLL_RECORD), c, tx.object(CLOCK)],
  });
  return tx;
}));

const tick = (`DRY${Date.now().toString(36).toUpperCase()}`).slice(0, 12);
results.push(await run('deploy_new_tick', () => {
  const tx = new Transaction();
  const bytes = Array.from(new TextEncoder().encode(tick));
  tx.moveCall({
    target: `${CALL_PKG}::movescription::deploy`,
    arguments: [
      tx.object(DEPLOY_RECORD),
      tx.pure.vector('u8', bytes),
      tx.pure.u64(1000000n),
      tx.pure.u64(BigInt(Date.now())),
      tx.pure.u64(1000n),
      tx.pure.u64(0n),
      tx.object(CLOCK),
    ],
  });
  return tx;
}));

if (listing) {
  results.push(await run('delist_not_owner', () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${MARKET_PKG}::market::delist`,
      arguments: [tx.object(SUIS_MKT), tx.pure.id(listing.id), tx.pure.u64(BigInt(listing.unit))],
    });
    return tx;
  }));
}

writeFileSync('/workspace/suimint-site/dryrun-results.json', JSON.stringify({ sender: SENDER, tickTried: tick, listing, results }, null, 2));
console.log('WROTE dryrun-results.json');
