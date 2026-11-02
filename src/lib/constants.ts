/** On-chain constants for Movescriptions + market (mainnet). */
export const NETWORK = 'mainnet' as const;

/** Prefer a JSON-RPC host that still serves legacy methods (Foundation fullnode deprecated). */
export const RPC_URL = 'https://mainnet.suiet.app';

export const TYPE_PACKAGE =
  '0x830fe26674dc638af7c3d84030e2575f44a2bdc1baa1f4757cfe010a4b106b6a';
/** Latest Movescriptions package for moveCall targets (v16). */
export const CALL_PACKAGE =
  '0x88a632719f065fae7509d335584e8ef9ea3cb528c77bb8d325835303d36c382e';

export const MOVESCRIPTION_TYPE = `${TYPE_PACKAGE}::movescription::Movescription`;
export const TICK_RECORD_V2_TYPE = `${TYPE_PACKAGE}::movescription::TickRecordV2`;
export const TICK_RECORD_TYPE = `${TYPE_PACKAGE}::movescription::TickRecord`;

export const DEPLOY_RECORD =
  '0x8fb949a8ae112ee025401cdb6dcdcfe04a8817bc2912a778a875e6b3697715da';
export const DEPLOY_TABLE =
  '0xbf93cd99f4f8e2663afdb8d9cdcb642ce3e171add2d88aa3f02c47294b052eeb';

/** Market type package (original) + latest call package (v18). */
export const MARKET_TYPE_PACKAGE =
  '0xb88f9149c55d6314b7ae436a730cfbf3a5d53522f37e2d56288531bb8adc7071';
export const MARKET_CALL_PACKAGE =
  '0x6db09c0709c91d743502e27f06a2352f62c1459c3c1ca9d1b3ee4a110e3f8ea0';
export const MARKETPLACE_HOUSE =
  '0x4a207448a10234ab1929779f3712b3d89adb17fbea6948bb176b36a2b2171eb6';

export const CLOCK = '0x6';

/** Known tick to Marketplace shared object (seed; UI also discovers via house). */
export const KNOWN_MARKETS: Record<string, string> = {
  SUIS: '0x20aac987cf2e33b56d4f883724e19c0b986f6b56c07ee9588c8f3cebaecc6c9b',
};

export const SITE_NAME = 'SUIRC20';
