export function formatYieldsPageData(pools: any) {
	const _pools = pools[0]?.data ?? []
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
