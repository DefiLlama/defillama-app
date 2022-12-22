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
		url: _urls[p.pool] ?? '',
		apyReward: p.apyReward > 0 ? p.apyReward : null,
		rewardTokens: p.apyReward > 0 ? p.rewardTokens : [],
		apyNet7d: p.apyBase7d > 0 ? Math.max(p.apyBase7d + p.il7d * 52, -100) : null // scale il7d (negative value) to year
	}))

	const poolsList = []

	const chainList: Set<string> = new Set()

	const projectList: Set<string> = new Set()

	const categoryList: Set<string> = new Set()

	_pools.forEach((pool) => {
		// remove potential undefined on projectName
		if (pool.projectName) {
			poolsList.push(pool)
			chainList.add(pool.chain)
			categoryList.add(pool.category)
			projectList.add(pool.projectName)
		}
	})

	let tokenNameMapping = {}
	for (const key of Object.keys(_config)) {
		if (key === 'cakedao') continue
		tokenNameMapping[_config[key].symbol] = _config[key].name
	}
	// add chain symbols too
	for (const chain of _chains) {
		tokenNameMapping[chain.tokenSymbol] = chain.name === 'xDai' ? 'Gnosis' : chain.name
	}
	// remove any null keys (where no token)
	tokenNameMapping = Object.fromEntries(Object.entries(tokenNameMapping).filter(([k, _]) => k !== 'null'))

	return {
		pools: poolsList,
		chainList: Array.from(chainList),
		projectList: Array.from(projectList),
		categoryList: Array.from(categoryList),
		tokenNameMapping
	}
}
