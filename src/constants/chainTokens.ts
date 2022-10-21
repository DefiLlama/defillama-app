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
		geckoId: 'witnet',
		symbol: 'WIT',
		cmcId: '14925'
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
		geckoId: 'aurora-near',
		symbol: 'AURORA',
		cmcId: '14803'
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
		geckoId: 'everscale',
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
		geckoId: 'nervos-network',
		symbol: 'CKB',
		cmcId: '4948'
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
		symbol: 'PARA',
		cmcId: null
	},
	Meter: {
		geckoId: 'meter',
		symbol: 'MTRG',
		cmcId: '5919'
	},
	Oasis: {
		geckoId: 'oasis-network',
		symbol: 'ROSE',
		cmcId: '7653'
	},
	Theta: {
		geckoId: 'theta-token',
		symbol: 'THETA',
		cmcId: '2416'
	},
	Syscoin: {
		geckoId: 'syscoin',
		symbol: 'SYS',
		cmcId: '541'
	},
	Moonbeam: {
		geckoId: 'moonbeam',
		symbol: 'GLMR',
		cmcId: '6836'
	},
	Astar: {
		geckoId: 'astar',
		symbol: 'ASTR',
		cmcId: '12885'
	},
	Curio: {
		geckoId: 'skale',
		symbol: 'SKL',
		cmcId: '5691'
	},
	Bittorrent: {
		geckoId: 'bittorrent',
		symbol: 'BTT',
		cmcId: '16086'
	},
	Genshiro: {
		geckoId: 'genshiro',
		symbol: 'GENS',
		cmcId: '10278'
	},
	Wax: {
		geckoId: 'wax',
		symbol: 'WAXP',
		cmcId: '2300'
	},
	Evmos: {
		geckoId: 'evmos',
		symbol: 'EVMOS',
		cmcId: null
	},
	Proton: {
		geckoId: 'proton',
		symbol: 'XPR',
		cmcId: '5350'
	},
	Kadena: {
		geckoId: 'kadena',
		symbol: 'KDA',
		cmcId: '5647'
	},
	Vite: {
		geckoId: 'vite',
		symbol: 'VITE',
		cmcId: '2937'
	},
	EthereumClassic: {
		geckoId: 'ethereum-classic',
		symbol: 'ETC',
		cmcId: '1321'
	},
	Milkomeda: {
		geckoId: 'cardano',
		symbol: 'ADA',
		cmcId: '2010'
	},
	DFK: {
		geckoId: 'defi-kingdoms',
		symbol: 'JEWEL',
		cmcId: '12319'
	},
	CLV: {
		geckoId: 'clover-finance',
		symbol: 'CLV',
		cmcId: '8384'
	},
	REInetwork: {
		geckoId: 'rei-network',
		symbol: 'REI',
		cmcId: '19819'
	},
	Crab: {
		geckoId: 'darwinia-crab-network',
		symbol: 'CRAB',
		cmcId: '9243'
	},
	Hedera: {
		geckoId: 'hedera-hashgraph',
		symbol: 'HBAR',
		cmcId: '4642'
	},
	Findora: {
		geckoId: 'findora',
		symbol: 'FRA',
		cmcId: '4249'
	},
	Hydra: {
		geckoId: 'hydra',
		symbol: 'HYDRA',
		cmcId: '8245'
	},
	Boba: {
		geckoId: 'boba-network  ',
		symbol: 'BOBA',
		cmcId: '14556'
	},
	Bitgert: {
		geckoId: 'bitrise-token',
		symbol: 'BRISE',
		cmcId: '11079'
	},
	Reef: {
		geckoId: 'reef-finance',
		symbol: 'REEF',
		cmcId: '6951'
	},
	Omni: {
		geckoId: 'omni',
		symbol: 'OMNI',
		cmcId: '83'
	},
	Candle: {
		geckoId: 'candle',
		symbol: 'CNDL',
		cmcId: '18327'
	},
	Bifrost: {
		geckoId: 'bifrost-native-coin',
		symbol: 'BNC',
		cmcId: '8705'
	},
	Stafi: {
		geckoId: 'stafi',
		symbol: 'FIS',
		cmcId: '5882'
	},
	Lachain: {
		geckoId: 'latoken',
		symbol: 'LA',
		cmcId: '2090'
	},
	Coti: {
		geckoId: 'coti',
		symbol: 'COTI',
		cmcId: '3992'
	},
	Bitcoincash: {
		geckoId: 'bitcoin-cash',
		symbol: 'BCH',
		cmcId: '1831'
	},
	Litecoin: {
		geckoId: 'litecoin',
		symbol: 'LTC',
		cmcId: '2'
	},
	Doge: {
		geckoId: 'dogecoin',
		symbol: 'DOGE',
		cmcId: '74'
	},
	Obyte: {
		geckoId: 'byteball',
		symbol: 'GBYTE',
		cmcId: '1492'
	},
	REI: {
		geckoId: null,
		symbol: null,
		cmcId: null
	},
	Bytomsidechain: {
		geckoId: 'bytom',
		symbol: 'BTM',
		cmcId: '1866'
	},
	Pallete: {
		geckoId: 'palette',
		symbol: 'PLT',
		cmcId: '16272'
	},
	Carbon: {
		geckoId: 'switcheo',
		symbol: 'SWTH',
		cmcId: '2620'
	},
	Starcoin: {
		geckoId: 'starcoin',
		symbol: 'STC',
		cmcId: '10202'
	},
	Terra2: {
		geckoId: 'terra-luna-2',
		symbol: 'LUNA',
		cmcId: '20314'
	},
	SXnetwork: {
		geckoId: 'sx-network',
		symbol: 'SX',
		cmcId: '8377'
	},
	Acala: {
		geckoId: 'acala',
		symbol: 'ACA',
		cmcId: '6756'
	},
	ICP: {
		geckoId: 'internet-computer',
		symbol: 'ICP',
		cmcId: '8916'
	},
	"Nova Network": {
    geckoId: "supernova",
    symbol: "SNT",
    cmcId: "15399"
  },
	Kintsugi: {
    geckoId: "kintsugi",
    symbol: "KINT",
    cmcId: "13675"
  },
	Interlay: {
    geckoId: "interlay",
    symbol: "INTR",
    cmcId: "20366"
  },
	Ultron: {
    geckoId: "ultron",
    symbol: "ULX",
    cmcId: "21524"
  },
	Dogechain: {
    geckoId: "dogechain",
    symbol: "DC",
    cmcId: "21414"
  },
	Juno: {
    geckoId: "juno-network",
    symbol: "JUNO",
    cmcId: "14299"
  },
  Tombchain: {
    geckoId: "tomb",
    symbol: "TOMB",
    cmcId: "11495"
  },
	Crescent: {
    geckoId: "crescent-network",
    symbol: "CRE",
    cmcId: null,
  },
	Vision: {
		geckoId: "vision-metaverse",
		symbol: "VS",
		cmcId: "19083"
	},
	EthereumPoW: {
		geckoId: "ethereum-pow-iou",
		symbol: "ETHW",
		cmcId: "21296"
	},
	Aptos: {
    geckoId: "aptos",
    symbol: "APT",
    cmcId: "21794",
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
