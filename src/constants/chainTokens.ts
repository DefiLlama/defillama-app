// TODO Replace this by a call to api.llama.fi/config (that way we only need to keep the server version up to date, now we have the data replicated)
export const chainCoingeckoIds = {
	Ethereum: {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	Palm: {
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
	OKTChain: {
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
	ROOTSTOCK: {
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
	'Nova Network': {
		geckoId: 'supernova',
		symbol: 'SNT',
		cmcId: '15399'
	},
	Kintsugi: {
		geckoId: 'kintsugi',
		symbol: 'KINT',
		cmcId: '13675'
	},
	Interlay: {
		geckoId: 'interlay',
		symbol: 'INTR',
		cmcId: '20366'
	},
	Ultron: {
		geckoId: 'ultron',
		symbol: 'ULX',
		cmcId: '21524'
	},
	Dogechain: {
		geckoId: 'dogechain',
		symbol: 'DC',
		cmcId: '21414'
	},
	Juno: {
		geckoId: 'juno-network',
		symbol: 'JUNO',
		cmcId: '14299'
	},
	Tombchain: {
		geckoId: 'tomb',
		symbol: 'TOMB',
		cmcId: '11495'
	},
	Crescent: {
		geckoId: 'crescent-network',
		symbol: 'CRE',
		cmcId: null
	},
	Vision: {
		geckoId: 'vision-metaverse',
		symbol: 'VS',
		cmcId: '19083'
	},
	EthereumPoW: {
		geckoId: 'ethereum-pow-iou',
		symbol: 'ETHW',
		cmcId: '21296'
	},
	Aptos: {
		geckoId: 'aptos',
		symbol: 'APT',
		cmcId: '21794'
	},
	Stride: {
		geckoId: 'stride',
		symbol: 'STRD',
		cmcId: '21781'
	},
	MUUCHAIN: {
		geckoId: 'muu-inu',
		symbol: 'MUU',
		cmcId: '22020'
	},
	MultiversX: {
		geckoId: 'elrond-erd-2',
		symbol: 'EGLD',
		cmcId: '6892'
	},
	TON: {
		geckoId: 'the-open-network',
		symbol: 'TON',
		cmcId: '11419'
	},
	Zeniq: {
		geckoId: null,
		symbol: 'ZENIQ',
		cmcId: null
	},
	Omax: {
		geckoId: 'omax-token',
		symbol: 'OMAX',
		cmcId: '13916'
	},
	Bitindi: {
		geckoId: 'bitindi-chain',
		symbol: 'BNI',
		cmcId: '22026'
	},
	Map: {
		geckoId: 'marcopolo',
		symbol: 'MAP',
		cmcId: '4956'
	},
	Stargaze: {
		geckoId: 'stargaze',
		symbol: 'STARS',
		cmcId: '16842'
	},
	Comdex: {
		geckoId: 'comdex',
		symbol: 'CMDX',
		cmcId: '14713'
	},
	Libre: {
		geckoId: 'libre',
		symbol: 'LIBRE',
		cmcId: null
	},
	Flare: {
		geckoId: 'flare-networks',
		symbol: 'FLR',
		cmcId: '4172'
	},
	Tlchain: {
		geckoId: 'tlchain',
		symbol: 'TLC',
		cmcId: null
	},
	CORE: {
		geckoId: 'coredaoorg',
		symbol: 'CORE',
		cmcId: '23254'
	},
	Oraichain: {
		geckoId: 'oraichain-token',
		symbol: 'ORAI',
		cmcId: '7533'
	},
	Persistence: {
		geckoId: 'persistence',
		symbol: 'XPRT',
		cmcId: '7281'
	},
	Rangers: {
		geckoId: 'rangers-protocol-gas',
		symbol: 'RPG',
		cmcId: '12221'
	},
	Loop: {
		geckoId: 'loopnetwork',
		symbol: 'LOOP',
		cmcId: '18761'
	},
	Bone: {
		geckoId: null,
		symbol: 'BONE',
		cmcId: null
	},
	Meta: {
		geckoId: 'metadium',
		symbol: 'META',
		cmcId: '3418'
	},
	Equilibrium: {
		geckoId: 'equilibrium-token',
		symbol: 'EQ',
		cmcId: '6780'
	},
	Regen: {
		geckoId: 'regen',
		symbol: 'REGEN',
		cmcId: '11646'
	},
	Quicksilver: {
		geckoId: 'quicksilver',
		symbol: 'QCK',
		cmcId: null
	},
	Oasys: {
		geckoId: 'oasys',
		symbol: 'OAS',
		cmcId: '22265'
	},
	Filecoin: {
		geckoId: 'filecoin',
		symbol: 'FIL',
		cmcId: '2280'
	},
	PulseChain: {
		geckoId: 'pulsechain',
		symbol: 'PLS',
		cmcId: null
	},
	XPLA: {
		geckoId: 'xpla',
		symbol: 'XPLA',
		cmcId: '22359'
	},
	Neutron: {
		geckoId: null,
		symbol: null,
		cmcId: null
	},
	Onus: {
		geckoId: 'onus',
		symbol: 'ONUS',
		cmcId: '15261'
	},
	Pokt: {
		geckoId: 'pocket-network',
		symbol: 'POKT',
		cmcId: '11823'
	},
	Quasar: {
		geckoId: null,
		symbol: 'QSR',
		cmcId: null
	},
	Concordium: {
		geckoId: 'concordium',
		symbol: 'CCD',
		cmcId: '18031'
	},
	Chihuahua: {
		geckoId: 'chihuahua-token',
		symbol: 'HUAHUA',
		cmcId: '17208'
	},
	Rollux: {
		geckoId: null,
		symbol: null,
		cmcId: null
	},
	Tenet: {
		geckoId: 'tenet-1b000f7b-59cb-4e06-89ce-d62b32d362b9',
		symbol: 'TENET',
		cmcId: '24892'
	},
	Mantle: {
		geckoId: 'mantle',
		symbol: 'MNT',
		cmcId: '27075'
	},
	Neon: {
		geckoId: 'neon',
		symbol: 'NEON',
		cmcId: '26735'
	},
	Base: {
		geckoId: null,
		symbol: null,
		cmcId: null
	},
	Linea: {
		geckoId: null,
		symbol: null,
		cmcId: null
	},
	GravityBridge: {
		geckoId: null,
		symbol: null,
		cmcId: null
	},
	'Aura Network': {
		geckoId: 'aura-network',
		symbol: 'AURA',
		cmcId: '20326'
	},
	Sei: {
		geckoId: 'sei-network',
		symbol: 'SEI',
		cmcId: '23149'
	},
	Sui: {
		geckoId: 'sui',
		symbol: 'SUI',
		cmcId: '20947'
	},
	ShimmerEVM: {
		geckoId: 'shimmer',
		symbol: 'SMR',
		cmcId: '14801'
	},
	MVC: {
		geckoId: 'microvisionchain',
		symbol: 'SPACE',
		cmcId: '24193'
	},
	ALV: {
		geckoId: 'alvey-chain',
		symbol: 'ALV',
		cmcId: null
	},
	DSC: {
		geckoId: 'decimal',
		symbol: 'DEL',
		cmcId: null
	},
	Darwinia: {
		geckoId: 'darwinia-network-native-token',
		symbol: 'RING',
		cmcId: '5798'
	},
	Pego: {
		geckoId: 'pego-network-2',
		symbol: 'PG',
		cmcId: '27723'
	},
	Kroma: {
		geckoId: 'kroma',
		symbol: 'KRO',
		cmcId: null
	},
	Archway: {
		geckoId: 'archway',
		symbol: 'ARCH',
		cmcId: '27358'
	},
	HydraDX: {
		geckoId: 'hydradx',
		github: ['galacticcouncil'],
		symbol: 'HDX',
		cmcId: '6753'
	},
	Flow: {
		geckoId: 'flow',
		symbol: 'FLOW',
		cmcId: '4558'
	},
	Kujira: {
		geckoId: 'kujira',
		symbol: 'KUJI',
		cmcId: '15185'
	},
	Canto: {
		geckoId: 'canto',
		symbol: 'CANTO',
		cmcId: '21516'
	},
	XRPL: {
		geckoId: 'ripple',
		symbol: 'XRP',
		cmcId: '52'
	},
	Cube: {
		geckoId: 'cube-network',
		symbol: 'CUBE',
		cmcId: '20519'
	},
	FunctionX: {
		geckoId: 'fx-coin',
		symbol: 'FX',
		cmcId: '3884'
	},
	Kekchain: {
		geckoId: 'kekchain',
		symbol: 'KEK',
		cmcId: '21606'
	},
	Injective: {
		geckoId: 'injective-protocol',
		symbol: 'INJ',
		cmcId: null
	},
	Step: {
		geckoId: 'stepex',
		symbol: 'SPEX',
		cmcId: '21725'
	},
	Dexit: {
		geckoId: 'dexit-finance',
		symbol: 'DXT',
		cmcId: null
	},
	Empire: {
		geckoId: null,
		symbol: 'EMPIRE',
		cmcId: null
	},
	'MAP Protocol': {
		geckoId: 'marcopolo',
		symbol: 'MAP',
		cmcId: '4956'
	},
	UX: {
		geckoId: 'umee',
		symbol: 'UX',
		cmcId: '16389'
	},
	'WEMIX3.0': {
		geckoId: 'wemix-token',
		symbol: 'WEMIX',
		cmcId: '7548'
	},
	'Persistence One': {
		geckoId: 'persistence',
		symbol: 'XPRT',
		cmcId: '7281'
	},
	Goerli: {
		geckoId: 'goerli-eth',
		symbol: 'GETH',
		cmcId: '23669'
	},
	Migaloo: {
		geckoId: 'white-whale',
		symbol: 'WHALE',
		cmcId: null
	},
	Grove: {
		geckoId: 'grove',
		symbol: 'GRV',
		cmcId: null
	},
	Hydration: {
		geckoId: 'hydradx',
		symbol: 'HDX',
		cmcId: '6753'
	},
	Manta: {
		geckoId: 'manta-network',
		symbol: 'MANTA',
		cmcId: '13631'
	},
	Beam: {
		geckoId: null,
		symbol: 'MC',
		cmcId: null
	},
	RENEC: {
		geckoId: 'renec',
		symbol: 'RENEC',
		cmcId: '24143'
	},
	'Bifrost Network': {
		geckoId: 'bifrost',
		symbol: 'BFC',
		cmcId: '7817'
	},
	Radix: {
		geckoId: 'radix',
		symbol: 'XRD',
		cmcId: '11948'
	},
	Nolus: {
		geckoId: 'nolus',
		symbol: 'NLS',
		cmcId: null
	},
	ETHF: {
		geckoId: 'ethereumfair',
		symbol: 'ETHF',
		cmcId: '21842'
	},
	MEER: {
		geckoId: 'qitmeer-network',
		symbol: 'MEER',
		cmcId: '15658'
	},
	'Horizen EON': {
		geckoId: 'zencash',
		symbol: 'ZEN',
		cmcId: null
	},
	Chiliz: {
		geckoId: 'chiliz',
		symbol: 'CHZ',
		cmcId: '4066'
	},
	Mayachain: {
		geckoId: 'cacao',
		symbol: 'CACAO',
		cmcId: null
	},
	Dash: {
		geckoId: 'dash',
		symbol: 'DASH',
		cmcId: '131'
	},
	Bostrom: {
		geckoId: 'bostrom',
		symbol: 'BOOT',
		cmcId: '19111'
	},
	Alephium: {
		geckoId: 'alephium',
		symbol: 'ALPH',
		cmcId: '14878'
	},
	Mode: {
		geckoId: 'mode',
		symbol: 'MODE',
		cmcId: null
	},
	FSC: {
		geckoId: 'fonsmartchain',
		symbol: 'FON',
		cmcId: '22607'
	},
	Newton: {
		geckoId: 'newton-project',
		symbol: 'NEW',
		cmcId: '3871'
	},
	JBC: {
		geckoId: null,
		symbol: 'JBC',
		cmcId: null
	},
	Sommelier: {
		geckoId: 'sommelier',
		symbol: 'SOMM',
		cmcId: '18248'
	},
	Bahamut: {
		geckoId: 'fasttoken',
		symbol: 'FTN',
		cmcId: '22615'
	},
	CMP: {
		geckoId: 'caduceus',
		symbol: 'CMP',
		cmcId: '20056'
	},
	Firechain: {
		geckoId: null,
		symbol: 'FIRE',
		cmcId: null,
		categories: ['EVM'],
		chainId: 529
	},
	AirDAO: {
		geckoId: 'amber',
		symbol: 'AMB',
		cmcId: '2081'
	},
	dYdX: {
		geckoId: 'dydx-chain',
		symbol: 'dYdX',
		cmcId: '28324'
	},
	Bitnet: {
		geckoId: 'bitnet',
		symbol: 'BTN',
		cmcId: null
	},
	ZetaChain: {
		geckoId: 'zetachain',
		symbol: 'ZETA',
		cmcId: '21259'
	},
	Celestia: {
		geckoId: 'celestia',
		symbol: 'TIA',
		cmcId: '22861'
	},
	Fraxtal: {
		geckoId: 'fraxtal',
		symbol: 'FXTL',
		cmcId: null
	},
	'Areon Network': {
		geckoId: 'areon-network',
		symbol: 'AREA',
		cmcId: '23262'
	},
	'Manta Atlantic': {
		geckoId: null,
		symbol: 'MANTA',
		cmcId: null
	},
	Xai: {
		geckoId: 'xai-blockchain',
		symbol: 'XAI',
		cmcId: '28374'
	},
	Bitrock: {
		geckoId: 'bitrock',
		symbol: 'BROCK',
		cmcId: '27606'
	},
	'Oasis Sapphire': {
		geckoId: null,
		symbol: 'ROSE',
		cmcId: null
	},
	Dymension: {
		geckoId: 'dymension',
		symbol: 'DYM',
		cmcId: '28932'
	},
	'Q Protocol': {
		geckoId: null,
		symbol: 'QGOV',
		cmcId: null
	},
	'zkLink Nova': {
		geckoId: 'zklink',
		symbol: 'ZKL',
		cmcId: null
	},
	'Immutable zkEVM': {
		geckoId: 'immutable-x',
		symbol: 'IMX',
		cmcId: '10603'
	},
	RSS3: {
		geckoId: 'rss3',
		symbol: 'RSS3',
		cmcId: null
	},
	Bittensor: {
		geckoId: 'bittensor',
		symbol: 'TAO',
		cmcId: '22974'
	},
	Degen: {
		geckoId: 'degen-base',
		symbol: 'DEGEN',
		cmcId: null
	},
	HAQQ: {
		geckoId: 'islamic-coin',
		symbol: 'ISLM',
		cmcId: '26220'
	},
	Venom: {
		geckoId: 'venom',
		symbol: 'VENOM',
		cmcId: '22059'
	},
	'Bitkub Chain': {
		geckoId: 'bitkub-coin',
		symbol: 'KUB',
		cmcId: '16093'
	},
	Nibiru: {
		geckoId: 'nibiru',
		symbol: 'NIBI',
		cmcId: '28508'
	},
	Planq: {
		geckoId: 'planq',
		symbol: 'PLQ',
		cmcId: '28804'
	},
	'LaChain Network': {
		geckoId: 'la-coin',
		symbol: 'LAC',
		cmcId: null
	},
	Endurance: {
		geckoId: 'endurance',
		symbol: 'ACE',
		cmcId: '28674'
	},
	BounceBit: {
		geckoId: 'bouncebit',
		symbol: 'BB',
		cmcId: '30746'
	},
	're.al': {
		geckoId: 're-al',
		symbol: 'RWA',
		cmcId: null
	},
	Genesys: {
		geckoId: 'genesys',
		symbol: 'GSYS',
		cmcId: '27940'
	},
	Polkadex: {
		geckoId: 'polkadex',
		symbol: 'PDEX',
		cmcId: '9017'
	},
	aelf: {
		geckoId: 'aelf',
		symbol: 'ELF',
		cmcId: '2299'
	},
	Lukso: {
		geckoId: 'lukso-token-2',
		symbol: 'LYX',
		cmcId: '27622'
	},
	Joltify: {
		geckoId: 'joltify',
		symbol: 'JOLT',
		cmcId: '19855'
	},
	Sanko: {
		geckoId: 'dream-machine-token',
		symbol: 'DMT',
		cmcId: '25653'
	},
	OXFUN: {
		geckoId: 'ox-fun',
		symbol: 'OX',
		cmcId: '29530'
	},
	Aeternity: {
		geckoId: 'aeternity',
		symbol: 'AE',
		cmcId: '1700'
	},
	Dexalot: {
		geckoId: 'dexalot',
		symbol: 'ALOT',
		cmcId: '18732'
	},
	BandChain: {
		geckoId: 'band-protocol',
		symbol: 'BAND',
		cmcId: '4679'
	},
	Gravity: {
		geckoId: 'g-token',
		symbol: 'G',
		cmcId: null
	},
	Chainflip: {
		geckoId: 'chainflip',
		symbol: 'FLIP',
		cmcId: '13268'
	},
	IDEX: {
		geckoId: 'aurora-dao',
		symbol: 'IDEX',
		cmcId: null
	},
	Zircuit: {
		geckoId: 'zircuit',
		symbol: 'ZRC',
		cmcId: '29711'
	},
	Electroneum: {
		geckoId: 'electroneum',
		symbol: 'ETN',
		cmcId: '2137'
	},
	Lisk: {
		geckoId: 'lisk',
		symbol: 'LSK',
		cmcId: null
	},
	HeLa: {
		geckoId: 'hela',
		symbol: 'HELA',
		cmcId: '2137'
	},
	'World Chain': {
		geckoId: 'worldcoin-wld',
		symbol: 'WLD',
		cmcId: null
	},
	ApeChain: {
		geckoId: 'apecoin',
		symbol: 'APE',
		cmcId: '18876'
	},
	'Asset Chain': {
		geckoId: 'xend-finance',
		symbol: 'RWA',
		cmcId: '8519'
	},
	UNIT0: {
		geckoId: 'unit0',
		symbol: 'UNIT0',
		cmcId: '33785'
	},
	Shido: {
		geckoId: 'shido-2',
		symbol: 'SHIDO',
		cmcId: '28211'
	},
	Redbelly: {
		geckoId: 'redbelly-network-token',
		symbol: 'RBNT',
		cmcId: null
	},
	Taraxa: {
		geckoId: 'taraxa',
		symbol: 'TARA',
		cmcId: '8715'
	},
	Sonic: {
		geckoId: 'sonic-3',
		symbol: 'S',
		cmcId: null
	},
	Sophon: {
		geckoId: 'sophon',
		symbol: 'SOPH',
		cmcId: null
	},
	Vana: {
		geckoId: 'vana',
		symbol: 'VANA',
		cmcId: null
	},
	Agoric: {
		geckoId: 'agoric',
		symbol: 'BLD',
		cmcId: null
	},
	Elys: {
		geckoId: 'elys-network',
		symbol: 'ELYS',
		cmcId: '32959'
	},
	Odyssey: {
		geckoId: 'dione',
		symbol: 'DIONE',
		cmcId: '21473'
	},
	Pryzm: {
		geckoId: 'pryzm',
		symbol: 'PRYZM',
		cmcId: null
	},
	CrossFi: {
		geckoId: 'crossfi-2',
		symbol: 'XFI',
		cmcId: '26202'
	},
	Waterfall: {
		geckoId: 'water-3',
		symbol: 'WATER',
		cmcId: '32282'
	},
	Mantra: {
		geckoId: 'mantra-dao',
		symbol: 'OM',
		cmcId: '6536'
	},
	Verus: {
		geckoId: 'verus-coin',
		symbol: 'VRSC',
		cmcId: '5049'
	},
	Plume: {
		geckoId: 'plume',
		symbol: 'PLUME',
		cmcId: null
	},
	'EDU Chain': {
		geckoId: 'edu-coin',
		symbol: 'EDU',
		cmcId: '24613'
	},
	Fluence: {
		geckoId: 'fluence-2',
		symbol: 'FLT',
		cmcId: '30097'
	},
	Swan: {
		geckoId: 'swan-chain',
		symbol: 'SWAN',
		cmcId: null
	},
	Artela: {
		geckoId: 'artela-network',
		symbol: 'ART',
		cmcId: null
	},
	Parex: {
		geckoId: 'parex',
		symbol: 'PRX',
		cmcId: '18094'
	},
	'SX Rollup': {
		geckoId: 'sx-network-2',
		symbol: 'SX',
		cmcId: null
	},
	Penumbra: {
		geckoId: 'penumbra',
		symbol: 'UM',
		cmcId: null
	},
	Berachain: {
		geckoId: 'berachain-bera',
		symbol: 'BERA',
		cmcId: '24647'
	},
	Story: {
		geckoId: 'story-2',
		symbol: 'IP',
		cmcId: '35626'
	}
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

export const chainCoingeckoIdsForGasNotMcap = {
	Optimism: {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	Arbitrum: {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	Base: {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	'ZKsync Era': {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	'Polygon zkEVM': {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	'Arbitrum Nova': {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	Boba: {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	},
	Metis: {
		geckoId: 'ethereum',
		symbol: 'ETH',
		cmcId: '1027'
	}
}
