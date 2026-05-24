import { slug } from '~/utils'

export async function getRaisesInvestorRoutes(): Promise<string[]> {
	const { fetchRaisesFromCache } = await import('~/server/datasetCache/raises')
	const raises = await fetchRaisesFromCache()
	const investorSlugs = new Set<string>()

	for (const raise of raises) {
		for (const investor of raise.leadInvestors ?? []) {
			const investorSlug = slug(investor)
			if (investorSlug) investorSlugs.add(investorSlug)
		}
		for (const investor of raise.otherInvestors ?? []) {
			const investorSlug = slug(investor)
			if (investorSlug) investorSlugs.add(investorSlug)
		}
	}

	const routes: string[] = []
	for (const investorSlug of investorSlugs) {
		routes.push(`raises/${investorSlug}`)
	}
	return routes
}
