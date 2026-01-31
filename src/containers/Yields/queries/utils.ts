import { buildEvmChainsSet, EVM_CHAINS_FALLBACK_SET } from '~/constants/chains'

export function formatYieldsPageData(poolsAndConfig: any) {
	let _pools = poolsAndConfig[0]?.data ?? []
	let _config = poolsAndConfig[1]?.protocols ?? []
	let _urls = poolsAndConfig[2] ?? []
	let _chains = poolsAndConfig[3] ?? []
	let _lite = poolsAndConfig[4] ?? []

	// Build EVM chains set from API data (chains with chainId are EVM)
	const evmChainsSet = _chains.length > 0 ? buildEvmChainsSet(_chains) : EVM_CHAINS_FALLBACK_SET

	// symbol in _config doesn't account for potential parentProtocol token, updating this here
	for (const i of Object.values(_config)) {
		if ([null, '-'].includes(i['symbol'])) {
			const parentId = _lite.protocols.find((l) => l.name === i['name'])?.parentProtocol

			if (parentId) {
				const geckoId = _lite.parentProtocols.find((p) => p.id === parentId)?.gecko_id
				i['symbol'] = geckoId ? 'x' : i['symbol']
			}
		}
	}

	// add projectName and audit fields from config to pools array
	_pools = _pools.map((p) => ({
		...p,
		projectName: _config[p.project]?.name ?? null,
		audits: _config[p.project]?.audits ?? null,
		airdrop: _config[p.project]?.symbol === null || _config[p.project]?.symbol === '-',
		category: _config[p.project]?.category ?? null,
		url: _urls[p.pool] ?? '',
		apyReward: p.apyReward > 0 ? p.apyReward : null,
		rewardTokens: p.apyReward > 0 ? p.rewardTokens : [],
		apyNet7d: p.apyBase7d > 0 ? Math.max(p.apyBase7d + p.il7d * 52, -100) : null // scale il7d (negative value) to year
	}))

	// add lsd apr
	const lsd = _pools.filter(
		(p) => p.category === 'Liquid Staking' && p.exposure === 'single' && p.project !== 'stafi' && p.symbol !== 'ETH'
	)
	const lsdSymbols = [...new Set(lsd.map((p) => p.symbol))]
	_pools = _pools.map((p) => {
		let apyLsd = null
		if (
			p.category !== 'Liquid Staking' &&
			lsdSymbols.some((i) => p.symbol.includes(i)) &&
			!['curve-dex', 'olympus-dao', 'convex-finance'].includes(p.project)
		) {
			const l = p.underlyingTokens?.length
			apyLsd = lsd
				.filter((i) => p.symbol.includes(i.symbol))
				.reduce(
					// balancer takes 50% of lsd apr as fee (https://docs.balancer.fi/concepts/governance/protocol-fees.html#wrapped-token-yield-fees)
					(acc, v) => (['balancer-v2', 'aura'].includes(p.project) ? (v.apyBase * 0.5) / l + acc : v.apyBase / l + acc),
					0
				)
			apyLsd = Number.isFinite(apyLsd) ? apyLsd : null
		}

		return {
			...p,
			apyLsd,
			apyBaseIncludingLsdApy: p.apyBase + apyLsd,
			apyIncludingLsdApy: p.apy + apyLsd,
			lsdTokenOnly: !p.symbol
				.split('-')
				.map((s) => lsdSymbols.some((i) => s.includes(i)))
				.includes(false)
		}
	})

	const poolsList = []

	const chainList: Set<string> = new Set()

	const projectList: Set<string> = new Set()

	const categoryList: Set<string> = new Set()

	for (const pool of _pools) {
		// remove potential undefined on projectName
		if (pool.projectName) {
			poolsList.push(pool)
			chainList.add(pool.chain)
			if (pool.category) categoryList.add(pool.category)
			projectList.add(pool.projectName)
		}
	}

	let tokenNameMapping = {}
	for (const key in _config) {
		if (key === 'cakedao') continue
		tokenNameMapping[_config[key].symbol] = _config[key].name
	}
	// add chain symbols too
	for (const chain of _chains) {
		tokenNameMapping[chain.tokenSymbol] = chain.name === 'xDai' ? 'Gnosis' : chain.name
	}

	tokenNameMapping['USDC'] = 'USD Coin'
	tokenNameMapping['VELO'] = 'Velodrome'
	// remove any null keys (where no token)
	const filteredTokenNameMapping: Record<string, string> = {}
	for (const k in tokenNameMapping) {
		if (k !== 'null') {
			filteredTokenNameMapping[k] = tokenNameMapping[k]
		}
	}
	tokenNameMapping = filteredTokenNameMapping

	const symbols = [...new Set(_pools.map((p) => p.symbol.split(' ')[0].split('-')).flat())]

	const tokens = [
		{
			name: 'All Bitcoins',
			symbol: 'ALL_BITCOINS',
			logo: null,
			fallbackLogo: null
		},
		{
			name: 'All USD Stablecoins',
			symbol: 'ALL_USD_STABLES',
			logo: null,
			fallbackLogo: null
		},
		{
			name: 'All Gold',
			symbol: 'ALL_GOLD',
			logo: null,
			fallbackLogo: null
		},
		{
			name: 'All Tokenized Commodities',
			symbol: 'ALL_TOKENIZED_COMMODITIES',
			logo: null,
			fallbackLogo: null
		}
	]

	const tokenSymbolsList = ['ALL_BITCOINS', 'ALL_USD_STABLES', 'ALL_GOLD', 'ALL_TOKENIZED_COMMODITIES']

	for (const token of symbols as string[]) {
		if (token) {
			tokens.push({
				name: token,
				symbol: token,
				logo: null,
				fallbackLogo: null
			})
			tokenSymbolsList.push(token)
		}
	}

	return {
		pools: poolsList,
		chainList: Array.from(chainList),
		projectList: Array.from(projectList),
		categoryList: Array.from(categoryList),
		tokenNameMapping,
		tokens,
		tokenSymbolsList,
		evmChains: Array.from(evmChainsSet)
	}
}
