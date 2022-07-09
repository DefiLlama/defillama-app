import { useMemo } from 'react'
import { quantile, median } from 'simple-statistics'
import { AGGREGATOPN_API, YIELD_POOLS_API } from '~/constants'

export async function getYieldPageData(query = null) {
	try {
		let pools = (await fetch(YIELD_POOLS_API).then((r) => r.json())).data

		// remove anchor cause UST dead
		pools = pools.filter((p) => p.project !== 'anchor')
		// temporary fix for those projects with undefined projectName field (happens if adaptor is a yield adaptor
		// but not available via tvl dashboard, will remove for now until fixed on adaptor side)
		pools = pools.filter((p) => p.projectName !== undefined)

		// need to take the latest info, scale apy accordingly
		const T = 365
		pools = pools.map((p) => ({ ...p, return: (1 + p.apy / 100) ** (1 / T) - 1 }))

		// get aggregated data containing info about mean, mean2, count, returnProduct
		// which we need to calc mu and sigma
		const aggregations = (await fetch(AGGREGATOPN_API).then((r) => r.json())).data
		for (const el of pools) {
			const d = aggregations.find((i) => i.pool === el.pool)

			if (d === undefined) {
				el['sigma'] = 0
				el['mu'] = el.apy
				el['count'] = 1
				continue
			}

			// calc std using welford's algorithm
			// https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance
			// For a new value newValue, compute the new count, new mean, the new M2.
			// mean accumulates the mean of the entire dataset
			// M2 aggregates the squared distance from the mean
			// count aggregates the number of samples seen so far
			let count = d.count
			let mean = d.mean
			let mean2 = d.mean2

			count += 1
			let delta = el.return - mean
			mean += delta / count
			let delta2 = el.return - mean
			mean2 += delta * delta2

			el['sigma'] = Math.sqrt((mean2 / (count - 1)) * T) * 100
			el['mu'] = (((1 + el.return) * d.returnProduct) ** (T / count) - 1) * 100
			el['count'] = count
		}

		// mark pools as outliers if outside boundary (let user filter via toggle on frontend)
		const columns = ['mu', 'sigma']
		const outlierBoundaries = {}
		for (const col of columns) {
			const x = pools.map((p) => p[col]).filter((p) => p !== undefined && p !== null)
			const x_iqr = quantile(x, 0.75) - quantile(x, 0.25)
			const x_median = median(x)
			const x_lb = x_median - 1.5 * x_iqr
			const x_ub = x_median + 1.5 * x_iqr
			outlierBoundaries[col] = { lb: x_lb, ub: x_ub }
		}
		pools = pools.map((p) => ({
			...p,
			outlier:
				p['mu'] < outlierBoundaries['mu']['lb'] ||
				p['mu'] > outlierBoundaries['mu']['ub'] ||
				p['sigma'] < outlierBoundaries['sigma']['lb'] ||
				p['sigma'] > outlierBoundaries['sigma']['ub']
		}))

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

export function useFormatYieldsData(poolsAndAggr, isLoading) {
	return useMemo(() => {
		if (isLoading || !poolsAndAggr) return { pools: [], chainList: [], projectList: [] }

		const { pools, aggregations } = poolsAndAggr

		// need to take the latest info, scale apy accordingly
		const T = 365

		// remove anchor cause UST dead
		// and temporary fix for those projects with undefined projectName field (happens if adaptor is a yield adaptor
		// but not available via tvl dashboard, will remove for now until fixed on adaptor side)
		const _poolsData = pools
			.filter((p) => p.projectName !== undefined || p.project !== 'anchor')
			.map((p) => ({ ...p, return: (1 + p.apy / 100) ** (1 / T) - 1 }))

		for (const el of _poolsData) {
			const d = aggregations.find((i) => i.pool === el.pool)

			if (d === undefined) {
				el['sigma'] = 0
				el['mu'] = el.apy
				el['count'] = 1
				continue
			}

			// calc std using welford's algorithm
			// https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance
			// For a new value newValue, compute the new count, new mean, the new M2.
			// mean accumulates the mean of the entire dataset
			// M2 aggregates the squared distance from the mean
			// count aggregates the number of samples seen so far
			let count = d.count
			let mean = d.mean
			let mean2 = d.mean2

			count += 1
			let delta = el.return - mean
			mean += delta / count
			let delta2 = el.return - mean
			mean2 += delta * delta2

			el['sigma'] = Math.sqrt((mean2 / (count - 1)) * T) * 100
			el['mu'] = (((1 + el.return) * d.returnProduct) ** (T / count) - 1) * 100
			el['count'] = count
		}

		// mark pools as outliers if outside boundary (let user filter via toggle on frontend)
		const columns = ['mu', 'sigma']
		const outlierBoundaries = {}
		for (const col of columns) {
			const x = _poolsData.map((p) => p[col]).filter((p) => p !== undefined && p !== null)
			const x_iqr = quantile(x, 0.75) - quantile(x, 0.25)
			const x_median = median(x)
			const x_lb = x_median - 1.5 * x_iqr
			const x_ub = x_median + 1.5 * x_iqr
			outlierBoundaries[col] = { lb: x_lb, ub: x_ub }
		}

		let data = _poolsData.map((p) => ({
			...p,
			outlier:
				p['mu'] < outlierBoundaries['mu']['lb'] ||
				p['mu'] > outlierBoundaries['mu']['ub'] ||
				p['sigma'] < outlierBoundaries['sigma']['lb'] ||
				p['sigma'] > outlierBoundaries['sigma']['ub']
		}))

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
	}, [poolsAndAggr, isLoading])
}
