import { slug } from '~/utils'
import { fetchRaisesFromCache } from './dataset.cache'

export async function getRaisesInvestorSlugsFromCache(): Promise<string[]> {
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

	return [...investorSlugs]
}
