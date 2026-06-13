import { slug } from '~/utils'

export async function getRaisesInvestorRoutes(): Promise<string[]> {
	const { fetchRaisesFromCache } = await import('~/containers/Raises/server/dataset.cache')
	const raises = await fetchRaisesFromCache()
	const investorSlugs = new Set<string>()

	for (const raise of raises) {
		for (const investor of raise.leadInvestors ?? []) {
			investorSlugs.add(slug(investor))
		}
		for (const investor of raise.otherInvestors ?? []) {
			investorSlugs.add(slug(investor))
		}
	}

	const routes: string[] = []
	for (const investorSlug of investorSlugs) {
		routes.push(`raises/${investorSlug}`)
	}
	return routes
}

export const getRaisesSitemapRoutes = getRaisesInvestorRoutes
