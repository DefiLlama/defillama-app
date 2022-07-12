export function formatYieldsPageData(poolsAndConfig: any) {
	let _pools = poolsAndConfig[0]?.data ?? []
	let _config = poolsAndConfig[1]?.protocols ?? []

	// add projectName and audit fields from config to pools array
	_pools = _pools.map((p) => ({ ...p, projectName: _config[p.project]?.name, audits: _config[p.project]?.audits }))
	// remove potential undefined on projectName
	const data = _pools.filter((p) => p.projectName)

	const chainList: Set<string> = new Set()

	const projectList: { name: string; slug: string }[] = []

	const projects: string[] = []

	data.forEach((p) => {
		chainList.add(p.chain)

		if (!projects.includes(p.projectName)) {
			projects.push(p.projectName)
			projectList.push({ name: p.projectName, slug: p.project })
		}
	})

	return {
		pools: data,
		chainList: Array.from(chainList),
		projectList
	}
}
