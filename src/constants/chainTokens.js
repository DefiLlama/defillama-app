// TODO Replace this by a call to api.llama.fi/config (that way we only need to keep the server version up to date, now we have the data replicated)
export const chainCoingeckoIds = {
  Ethereum: {
    geckoId: 'ethereum',
    symbol: 'ETH',
    cmcId: '1027'
  },
  Arbitrum: {
    geckoId: null,
    symbol: 'ETH',
    cmcId: null
  },
  Palm: {
    geckoId: null,
    symbol: null,
    cmcId: null
  },
  Optimism: {
    geckoId: null,
    symbol: null,
    cmcId: null
  },
  Stacks: {
    geckoId: 'blockstack',
    symbol: 'STX',
    cmcId: '4847'
  },
  PolyNetwork: {
    geckoId: null,
    symbol: null,
    cmcId: null
  },
  Conflux: {
    geckoId: 'conflux-token',
    symbol: 'CFX',
    cmcId: '7334'
  },
  Nuls: {
    geckoId: 'nuls',
    symbol: 'NULS',
    cmcId: '2092'
  },
  Witnet: {
    geckoId: null,
    symbol: null,
    cmcId: null
  },
  Binance: {
    geckoId: 'binancecoin',
    symbol: 'BNB',
    cmcId: '1839'
  },
  BSC: {
    geckoId: 'binancecoin',
    symbol: 'BNB',
    cmcId: '1839'
  },
  Avalanche: {
    geckoId: 'avalanche-2',
    symbol: 'AVAX',
    cmcId: '5805'
  },
  Solana: {
    geckoId: 'solana',
    symbol: 'SOL',
    cmcId: '5426'
  },
  Polygon: {
    geckoId: 'matic-network',
    symbol: 'MATIC',
    cmcId: '3890'
  },
  Terra: {
    geckoId: 'terra-luna',
    symbol: 'LUNA',
    cmcId: '4172'
  },
  Fantom: {
    geckoId: 'fantom',
    symbol: 'FTM',
    cmcId: '3513'
  },
  xDai: {
    geckoId: 'xdai-stake',
    symbol: 'STAKE',
    cmcId: '5601'
  },
  Heco: {
    geckoId: 'huobi-token',
    symbol: 'HT',
    cmcId: '2502'
  },
  Kava: {
    geckoId: 'kava',
    symbol: 'KAVA',
    cmcId: '4846'
  },
  OKExChain: {
    geckoId: 'okexchain',
    symbol: 'OKT',
    cmcId: '8267'
  },
  Wanchain: {
    geckoId: 'wanchain',
    symbol: 'WAN',
    cmcId: '2606'
  },
  DefiChain: {
    geckoId: 'defichain',
    symbol: 'DFI',
    cmcId: '5804'
  },
  Ontology: {
    geckoId: 'ontology',
    symbol: 'ONT',
    cmcId: '2566'
  },
  Bitcoin: {
    geckoId: 'bitcoin',
    symbol: 'BTC',
    cmcId: '1'
  },
  Energi: {
    geckoId: 'energi',
    symbol: 'NRG',
    cmcId: '3218'
  },
  Secret: {
    geckoId: 'secret',
    symbol: 'SCRT',
    cmcId: '5604'
  },
  Zilliqa: {
    geckoId: 'zilliqa',
    symbol: 'ZIL',
    cmcId: '2469'
  },
  NEO: {
    geckoId: 'neo',
    symbol: 'NEO',
    cmcId: '1376'
  },
  Harmony: {
    geckoId: 'harmony',
    symbol: 'ONE',
    cmcId: '3945'
  },
  RSK: {
    geckoId: 'rootstock',
    symbol: 'RBTC',
    cmcId: '3626'
  },
  Sifchain: {
    geckoId: 'sifchain',
    symbol: 'EROWAN',
    cmcId: '8541'
  },
  Algorand: {
    geckoId: 'algorand',
    symbol: 'ALGO',
    cmcId: '4030'
  },
  Osmosis: {
    geckoId: 'osmosis',
    symbol: 'OSMO',
    cmcId: '12220'
  },
  Thorchain: {
    geckoId: 'thorchain',
    symbol: 'RUNE',
    cmcId: '4157'
  },
  Tron: {
    geckoId: 'tron',
    symbol: 'TRON',
    cmcId: '1958'
  },
  Icon: {
    geckoId: 'icon',
    symbol: 'ICX',
    cmcId: '2099'
  },
  Tezos: {
    geckoId: 'tezos',
    symbol: 'XTZ',
    cmcId: '2011'
  },
  Celo: {
    geckoId: 'celo',
    symbol: 'CELO',
    cmcId: '5567'
  },
  Kucoin: {
    geckoId: 'kucoin-shares',
    symbol: 'KCS',
    cmcId: '2087'
  },
  KCC: {
    geckoId: 'kucoin-shares',
    symbol: 'KCS',
    cmcId: '2087'
  },
  Karura: {
    geckoId: 'karura',
    symbol: 'KAR',
    cmcId: '10042'
  },
  Moonriver: {
    geckoId: 'moonriver',
    symbol: 'MOVR',
    cmcId: '9285'
  },
  Waves: {
    geckoId: 'waves',
    symbol: 'WAVES',
    cmcId: '1274'
  },
  Klaytn: {
    geckoId: 'klay-token',
    symbol: 'KLAY',
    cmcId: '4256'
  },
  IoTeX: {
    geckoId: 'iotex',
    symbol: 'IOTX',
    cmcId: '2777'
  },
  Ultra: {
    geckoId: 'ultra',
    symbol: 'UOS',
    cmcId: '4189'
  },
  Kusama: {
    geckoId: 'kusama',
    symbol: 'KSM',
    cmcId: '5034'
  },
  Shiden: {
    geckoId: 'shiden',
    symbol: 'SDN'
  },
  Telos: {
    geckoId: 'telos',
    symbol: 'TLOS',
    cmcId: '4660'
  },
  ThunderCore: {
    geckoId: 'thunder-token',
    symbol: 'TT',
    cmcId: '3930'
  },
  Lamden: {
    geckoId: 'lamden',
    symbol: 'TAU',
    cmcId: '2337'
  },
  Near: {
    geckoId: 'near',
    symbol: 'NEAR',
    cmcId: '6535'
  },
  Aurora: {
    geckoId: null,
    symbol: null,
    cmcId: null
  },
  EOS: {
    geckoId: 'eos',
    symbol: 'EOS',
    cmcId: '1765'
  },
  Songbird: {
    geckoId: 'songbird',
    symbol: 'SGB',
    cmcId: '12186'
  },
  EnergyWeb: {
    geckoId: 'energy-web-token',
    symbol: 'EWT',
    cmcId: '5268'
  },
  HPB: {
    geckoId: 'high-performance-blockchain',
    symbol: 'HPB',
    cmcId: '2345'
  },
  GoChain: {
    geckoId: 'gochain',
    symbol: 'GO',
    cmcId: '2861'
  },
  TomoChain: {
    geckoId: 'tomochain',
    symbol: 'TOMO',
    cmcId: '2570'
  },
  Fusion: {
    geckoId: 'fsn',
    symbol: 'FSN',
    cmcId: '2530'
  },
  Kardia: {
    geckoId: 'kardiachain',
    symbol: 'KAI',
    cmcId: '5453'
  },
  Fuse: {
    geckoId: 'fuse-network-token',
    symbol: 'FUSE',
    cmcId: '5634'
  },
  SORA: {
    geckoId: 'sora',
    symbol: 'XOR',
    cmcId: '5802'
  },
  smartBCH: {
    geckoId: 'bitcoin-cash',
    symbol: 'BCH',
    cmcId: '1831'
  },
  Elastos: {
    geckoId: 'elastos',
    symbol: 'ELA',
    cmcId: '2492'
  },
  Hoo: {
    geckoId: 'hoo-token',
    symbol: 'HOO',
    cmcId: '7543'
  },
  Cronos: {
    geckoId: 'crypto-com-chain',
    symbol: 'CRO',
    cmcId: '3635'
  },
  ImmutableX: {
    geckoId: '',
    symbol: 'ETH',
    cmcId: ''
  },
  Metis: {
    geckoId: 'metis-token',
    symbol: 'METIS',
    cmcId: '9640'
  },
  Ubiq: {
    geckoId: 'ubiq',
    symbol: 'UBQ',
    cmcId: '588'
  },
  Mixin: {
    geckoId: 'mixin',
    symbol: 'XIN',
    cmcId: '2349'
  },
  Everscale: {
    geckoId: 'ton-crystal',
    symbol: 'EVER',
    cmcId: '7505'
  },
  VeChain: {
    geckoId: 'vechain',
    symbol: 'VET',
    cmcId: '3077'
  },
  XDC: {
    geckoId: 'xdce-crowd-sale',
    symbol: 'XDC',
    cmcId: '2634'
  },
  Velas: {
    geckoId: 'velas',
    symbol: 'VLX',
    cmcId: '4747'
  },
  Godwoken: {
    geckoId: null,
    symbol: null,
    cmcId: null
  },
  Callisto: {
    geckoId: 'callisto',
    symbol: 'CLO',
    cmcId: '2757'
  },
  CSC: {
    geckoId: 'coinex-token',
    symbol: 'CET',
    cmcId: '2941'
  },
  Ergo: {
    geckoId: 'ergo',
    symbol: 'ERG',
    cmcId: '1555'
  },
  Cardano: {
    geckoId: 'cardano',
    symbol: 'ADA',
    cmcId: '2010'
  },
  Liquidchain: {
    geckoId: 'liquidchain',
    symbol: 'XLC',
    cmcId: null
  },
  Nahmii: {
    geckoId: 'nahmii',
    symbol: 'NII',
    cmcId: '4865'
  },
  Parallel: {
    geckoId: null,
    symbol: "PARA",
    cmcId: null,
  },
  Meter: {
    geckoId: "meter",
    symbol: "MTRG",
    cmcId: "5919",
  },
  Oasis: {
    geckoId: "oasis-network",
    symbol: "ROSE",
    cmcId: "7653",
  },
  Theta: {
    geckoId: "theta-token",
    symbol: "THETA",
    cmcId: "2416",
  },
  Syscoin: {
    geckoId: "syscoin",
    symbol: "SYS",
    cmcId: "541",
  },
  Moonbeam: {
    geckoId: "moonbeam",
    symbol: "GLMR",
    cmcId: "6836",
  },
  Astar: {
    geckoId: "astar",
    symbol: "ASTR",
    cmcId: "12885",
  },
  Curio: {
    geckoId: null,
    symbol: null,
    cmcId: null,
  },
  Bittorrent: {
    geckoId: "bittorrent",
    symbol: "BTT",
    cmcId: "16086",
  },
}

export const chainMarketplaceMappings = {
  opensea: 'Ethereum',
  pancakeswap: 'BSC',
  immutablex: 'ImmutableX',
  treasure: 'Arbitrum',
  magiceden: 'Solana',
  randomearth: 'Terra',
  jpgstore: 'Cardano'
}

export const basicChainOptions = ['All', 'Ethereum', 'Solana', 'Polygon', 'Fantom', 'Avalanche']
export const extraChainOptions = ['Terra', 'Arbitrum', 'Binance', 'Celo', 'Harmony']

export const priorityChainFilters = [
  'All',
  'Ethereum',
  'Solana',
  'Polygon',
  'Fantom',
  'Avalanche',
  'Terra',
  'Arbitrum',
  'Binance',
  'Celo',
  'Harmony',
  'Tron',
  'Waves',
  'Heco'
]
