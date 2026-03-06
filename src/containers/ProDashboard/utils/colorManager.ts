export const EXTENDED_COLOR_PALETTE = [
	'#cc3e6d',
	'#4691ce',
	'#4cae4f',
	'#c98e36',
	'#972da9',
	'#2d9ba9',
	'#cc5f3e',
	'#4051b5',
	'#8bc34b',
	'#cba63a',
	'#673ab6',
	'#29998e',
	'#cc473e',
	'#3394c1',
	'#c0ce46',
	'#c97636',
	'#633ecc',
	'#30b575',
	'#b9315f',
	'#3175b9',
	'#ccb23e',
	'#65258d',
	'#298c99',
	'#cb3a3a',
	'#3e9fcc',
	'#7bcb3a',
	'#b63ecc',
	'#2a9d5a',
	'#cc683e',
	'#3e72cc',
	'#c9b136',
	'#9836c9',
	'#36bbc9',
	'#c94e36',
	'#3acba6',
	'#b034c5'
]

export const COLOR_PALETTE_2 = [
	'#cc5f3e',
	'#3e9fcc',
	'#972da9',
	'#4cae4f',
	'#994529',
	'#cc3e6d',
	'#326abd',
	'#8bc34b',
	'#673ab6',
	'#9f512d',
	'#ce468e',
	'#298c99',
	'#c0ce46',
	'#b034c5',
	'#a36666',
	'#b9315f',
	'#4691ce',
	'#30b575',
	'#633ecc',
	'#ca8e3f',
	'#cc4c3e',
	'#4295cd',
	'#2e8a56',
	'#8942cd',
	'#ba8c4f',
	'#cba63a',
	'#3394c1',
	'#299929',
	'#6d3ecc',
	'#c98e36',
	'#8a7d6a',
	'#3175b9',
	'#7bcb3a',
	'#65258d',
	'#cd8742',
	'#c95d36',
	'#3680c9',
	'#36c936'
]

function simpleHash(str: string): number {
	let hash = 0
	let prime = 31

	for (let i = 0; i < str.length; i++) {
		hash = (hash * prime + str.charCodeAt(i) * (i + 1)) >>> 0
	}

	return hash
}

export const generateConsistentChartColor = (
	itemName: string,
	fallbackColor: string,
	itemType: 'protocol' | 'chain' = 'protocol',
	useConsistentColors: boolean = true
): string => {
	if (!useConsistentColors || !itemName || itemName === 'unknown') {
		return fallbackColor
	}

	const hash = simpleHash(`${itemType}-${itemName}`)

	const colorIndex = hash % EXTENDED_COLOR_PALETTE.length

	return EXTENDED_COLOR_PALETTE[colorIndex]
}

export const colorManager = {
	getItemColor: (itemName: string, itemType: 'protocol' | 'chain', fallbackColor?: string) => {
		return generateConsistentChartColor(itemName, fallbackColor || '#8884d8', itemType, true)
	}
}

export const STABLECOIN_TOKEN_COLORS: Record<string, string> = {
	USDT: '#009393',
	Tether: '#009393',
	USDC: '#2775CA',
	'USD Coin': '#2775CA',
	DAI: '#F4B731',
	Dai: '#F4B731',
	USDe: '#3A3A3A',
	'Ethena USDe': '#3A3A3A',
	BUIDL: '#111111',
	USD1: '#D2B48C',
	USDS: '#1BAB9B',
	'Sky Dollar': '#1BAB9B',
	PYUSD: '#0070E0',
	'PayPal USD': '#0070E0',
	USDTB: '#C0C0C0',
	FDUSD: '#00D395',
	Others: '#FF1493'
}
