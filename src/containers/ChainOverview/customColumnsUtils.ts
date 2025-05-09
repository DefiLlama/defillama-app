export const sampleProtocol = {
	name: 'Pendle',
	slug: 'pendle',
	chains: ['Ethereum', 'Arbitrum', 'Optimism', 'Binance', 'BSC', 'OP Mainnet', 'Mantle', 'Base', 'Sonic', 'Berachain'],
	category: 'Yield',
	tvl: {
		default: {
			tvl: 3342618874.186361,
			tvlPrevDay: 3278311992.4107237,
			tvlPrevWeek: 3037305538.9910874,
			tvlPrevMonth: 3092652399.4909043
		},
		staking: {
			tvl: 208900390.34536666,
			tvlPrevDay: 196577023.94138634,
			tvlPrevWeek: 213657387.70061365,
			tvlPrevMonth: 173728082.37494668
		},
		pool2: {
			tvl: 1653011.7550280518,
			tvlPrevDay: 1555972.8199892591,
			tvlPrevWeek: 1685498.7409283835,
			tvlPrevMonth: 1377086.9400414496
		},
		doublecounted: {
			tvl: 3342618874.186361,
			tvlPrevDay: 3278311992.4107237,
			tvlPrevWeek: 3037305538.9910874,
			tvlPrevMonth: 3092652399.4909043
		}
	},
	tvlChange: {
		change1d: 1.961585167138066,
		change7d: 10.052111362385045,
		change1m: 8.082591976279152
	},
	mcap: 552591758.0142369,
	mcaptvl: 0.17,
	strikeTvl: true,
	fees: {
		total24h: 13689,
		total7d: 100059,
		total30d: 1148707,
		total1y: 19280143,
		average1y: 52822.3095890411,
		totalAllTime: 25640450,
		pf: 40.09
	},
	revenue: {
		total24h: 12581,
		total7d: 92307,
		total30d: 1133455,
		total1y: 19085881,
		average1y: 52290.08493150685,
		totalAllTime: 25287865,
		ps: 40.63
	},
	dexs: {
		total24h: 377779013,
		total7d: 1177832690,
		change_7dover7d: 194.74,
		totalAllTime: 22702816840
	}
}

export const FIELD_ALIASES = {
	mcap: 'mcap',
	// TVL fields
	tvl: 'tvl_default_tvl',
	tvlPrevDay: 'tvl_default_tvlPrevDay',
	tvlPrevWeek: 'tvl_default_tvlPrevWeek',
	tvlPrevMonth: 'tvl_default_tvlPrevMonth',
	// TVL change fields
	change_1d: 'tvlChange_change1d',
	change_7d: 'tvlChange_change7d',
	change_1m: 'tvlChange_change1m',
	// Fees fields
	fees_24h: 'fees_total24h',
	fees_7d: 'fees_total7d',
	fees_30d: 'fees_total30d',
	fees_1y: 'fees_total1y',
	average_fees_1y: 'fees_average1y',
	cumulativeFees: 'fees_totalAllTime',
	pf: 'fees_pf',
	// Revenue fields
	revenue_24h: 'revenue_total24h',
	revenue_7d: 'revenue_total7d',
	revenue_30d: 'revenue_total30d',
	revenue_1y: 'revenue_total1y',
	average_revenue_1y: 'revenue_average1y',
	cumulativeRevenue: 'revenue_totalAllTime',
	ps: 'revenue_ps',
	// Dexs fields
	volume_24h: 'dexs_total24h',
	volume_7d: 'dexs_total7d',
	volumeChange_7d: 'dexs_change_7dover7d',
	cumulativeVolume: 'dexs_totalAllTime'
}

export const AVAILABLE_FUNCTIONS = [
	{ name: 'abs', type: 'operator', args: 'x' },
	{ name: 'ceil', type: 'operator', args: 'x' },
	{ name: 'floor', type: 'operator', args: 'x' },
	{ name: 'round', type: 'operator', args: 'x' },
	{ name: 'roundTo', type: 'operator', args: 'x, n' },
	{ name: 'sqrt', type: 'operator', args: 'x' },
	{ name: 'not', type: 'operator', args: 'x' },
	{ name: 'min', type: 'function', args: 'a, b, ...' },
	{ name: 'max', type: 'function', args: 'a, b, ...' },
	{ name: 'if', type: 'function', args: 'c, a, b' }
]

export const AVAILABLE_FIELDS = Object.keys(FIELD_ALIASES)

export function replaceAliases(formula: string): string {
	let result = formula
	for (const [alias, path] of Object.entries(FIELD_ALIASES)) {
		result = result.replace(new RegExp(`\\b${alias}\\b`, 'g'), path)
	}
	return result
}
