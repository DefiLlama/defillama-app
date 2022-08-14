export function formatYieldsPageData(poolsAndConfig: any) {
	let _pools = poolsAndConfig[0]?.data ?? []
	let _config = poolsAndConfig[1]?.protocols ?? []
	let _urls = poolsAndConfig[2] ?? []
	let _chains = poolsAndConfig[3] ?? []

	// add projectName and audit fields from config to pools array
	_pools = _pools.map((p) => ({
		...p,
		symbol:
			p.poolMeta !== undefined && p.poolMeta !== null && p.poolMeta.length > 1
				? `${p.symbol} (${p.poolMeta})`
				: p.symbol,
		projectName: _config[p.project]?.name,
		audits: _config[p.project]?.audits,
		airdrop: _config[p.project]?.symbol === null || _config[p.project]?.symbol === '-',
		category: _config[p.project]?.category,
		url: p.project === 'uniswap' ? formatUniUrl(p) : _urls[p.project] ?? '',
		apyReward: p.apyReward > 0 ? p.apyReward : null,
		rewardTokens: p.apyReward > 0 ? p.rewardTokens : []
	}))

	const poolsList = []

	const chainList: Set<string> = new Set()

	const projectList: { name: string; slug: string }[] = []

	const categoryList: Set<string> = new Set()

	_pools.forEach((pool) => {
		// remove potential undefined on projectName
		if (pool.projectName) {
			poolsList.push(pool)
			chainList.add(pool.chain)
			categoryList.add(pool.category)

			if (!projectList.find((p) => p.name === pool.projectName)) {
				projectList.push({ name: pool.projectName, slug: pool.project })
			}
		}
	})

	let tokenNameMapping = {}
	for (const key of Object.keys(_config)) {
		if (key === 'cakedao') continue
		tokenNameMapping[_config[key].symbol] = _config[key].name
	}
	// add chain symbols too
	for (const chain of _chains) {
		tokenNameMapping[chain.tokenSymbol] = chain.name
	}
	// remove any null keys (where no token)
	tokenNameMapping = Object.fromEntries(Object.entries(tokenNameMapping).filter(([k, _]) => k !== 'null'))

	return {
		pools: poolsList,
		chainList: Array.from(chainList),
		projectList,
		categoryList: Array.from(categoryList),
		tokenNameMapping
	}
}

const formatUniUrl = (p) => {
	const token0 = p.underlyingTokens === undefined ? '' : p.underlyingTokens[0]
	const token1 = p.underlyingTokens === undefined ? '' : p.underlyingTokens[1]
	const chain = p.chain.toLowerCase() === 'ethereum' ? 'mainnet' : p.chain.toLowerCase()
	if (p.poolMeta) {
		const feeTier = Number(p.poolMeta.replace('%', '')) * 10000
		return `https://app.uniswap.org/#/add/${token0}/${token1}/${feeTier}?chain=${chain}`
	} else {
		return `https://app.uniswap.org/#/add/v2/${token0}/${token1}?chain=${chain}`
	}
}
