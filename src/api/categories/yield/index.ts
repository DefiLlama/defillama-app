import { YIELD_POOLS_API } from '~/constants'

export async function getYieldPageData(query = null) {
	try {
		// note(!) the api supports direct queries of chain or projectName
		// however, i have no clue yet how to make sure that the chainList is complete for the
		// filter section on the PageViews. so to get around this for now i just always load the full
		// batch of data and filter on the next.js server side.
		// this only affects /chain/[chain] and /project/[project]. for /pool/[pool] we are filtering
		// on the db level (see `getYieldPoolData`)
		let pools = (await fetch(YIELD_POOLS_API).then((r) => r.json())).data

		// remove anchor cause UST dead
		pools = pools.filter((p) => p.project !== 'anchor')

		const chainList = new Set()

		const projectList = []

		const projects = []

		pools.forEach((p) => {
			chainList.add(p.chain)

			if (!projects.includes(p.projectName)) {
				projects.push(p.projectName)
				projectList.push({ name: p.projectName, slug: p.project })
			}
		})

		// for chain, project and pool queries
		if (query !== null && Object.keys(query)[0] !== 'token') {
			const queryKey = Object.keys(query)[0]
			const queryVal = Object.values(query)[0]
			pools = pools.filter((p) => p[queryKey] === queryVal)
		}

		return {
			props: {
				pools,
				chainList: Array.from(chainList),
				projectList
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}
