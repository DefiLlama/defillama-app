export function formatYieldsPageData(poolsAndConfig: any) {
	let _pools = poolsAndConfig[0]?.data ?? []
	let _config = poolsAndConfig[1]?.protocols ?? []

	// NOTE(slasher) tmp hardcoded aave change until i got cloudformatio access so i can update the adaptor code
	// right now the adaptor will store it as aave, but config has changed values to aave-v2
	_pools = _pools.map((p) => ({ ...p, project: p.project === 'aave' ? 'aave-v2' : p.project }))

	// add projectName and audit fields from config to pools array
	_pools = _pools.map((p) => ({
		...p,
		projectName: _config[p.project]?.name,
		audits: _config[p.project]?.audits,
		airdrop: _config[p.project]?.symbol === null || _config[p.project]?.symbol === '-'
	}))

	const poolsList = []

	const chainList: Set<string> = new Set()

	const projectList: { name: string; slug: string }[] = []

	_pools.forEach((pool) => {
		// remove potential undefined on projectName
		if (pool.projectName) {
			poolsList.push(pool)
			chainList.add(pool.chain)

			if (!projectList.find((p) => p.name === pool.projectName)) {
				projectList.push({ name: pool.projectName, slug: pool.project })
			}
		}
	})

	return {
		pools: poolsList,
		chainList: Array.from(chainList),
		projectList
	}
}
