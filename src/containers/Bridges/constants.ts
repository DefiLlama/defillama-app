type BlockExplorerEntry = [baseUrl: string, name: string]

export const BRIDGE_PROPERTIES_TO_KEEP = [
	'displayName',
	'name',
	'symbol',
	'icon',
	'chains',
	'lastDailyVolume',
	'dayBeforeLastVolume',
	'weeklyVolume',
	'monthlyVolume',
	'txsPrevDay',
	'change_1d',
	'change_7d',
	'change_1m'
] as const

export const BLOCK_EXPLORERS_TXS: Record<string, BlockExplorerEntry> = {
	ethereum: ['https://etherscan.io/tx/', 'Etherscan'],
	bsc: ['https://bscscan.com/tx/', 'Bscscan'],
	xdai: ['https://gnosisscan.io/tx/', 'GnosisScan'],
	avax: ['https://snowtrace.io/tx/', 'Snowtrace'],
	fantom: ['https://ftmscan.com/tx/', 'FTMscan'],
	heco: ['https://hecoinfo.com/tx/', 'HecoInfo'],
	polygon: ['https://polygonscan.com/tx/', 'PolygonScan'],
	solana: ['https://solscan.io/tx/', 'Solscan'],
	arbitrum: ['https://arbiscan.io/tx/', 'Arbiscan'],
	optimism: ['https://optimistic.etherscan.io/tx/', 'Optimism Explorer'],
	aurora: ['https://aurorascan.dev/tx/', 'AuroraScan'],
	celo: ['https://explorer.celo.org/mainnet/tx/', 'Celo Explorer'],
	klaytn: ['https://scope.klaytn.com/tx/', 'Klaytn Scope']
}

export const BLOCK_EXPLORERS_ADDRESSES: Record<string, BlockExplorerEntry> = {
	ethereum: ['https://etherscan.io/address/', 'Etherscan'],
	bsc: ['https://bscscan.com/address/', 'Bscscan'],
	xdai: ['https://gnosisscan.io/address/', 'GnosisScan'],
	avax: ['https://snowtrace.io/address/', 'Snowtrace'],
	fantom: ['https://ftmscan.com/address/', 'FTMscan'],
	heco: ['https://hecoinfo.com/address/', 'HecoInfo'],
	polygon: ['https://polygonscan.com/address/', 'PolygonScan'],
	solana: ['https://solscan.io/address/', 'Solscan'],
	arbitrum: ['https://arbiscan.io/address/', 'Arbiscan'],
	optimism: ['https://optimistic.etherscan.io/address/', 'Optimism Explorer'],
	aurora: ['https://aurorascan.dev/address/', 'AuroraScan'],
	celo: ['https://explorer.celo.org/mainnet/address/', 'Celo Explorer'],
	klaytn: ['https://scope.klaytn.com/account/', 'Klaytn Scope']
}
