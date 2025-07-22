import { PROTOCOLS_TREASURY } from '~/constants'
import { fetchJson } from '~/utils/async'

export const getTreasuryData = async () => {
	const treasuries = await fetchJson(PROTOCOLS_TREASURY)
	return treasuries
		.map((t) => ({
			...t,
			...['majors', 'others', 'ownTokens', 'stablecoins'].reduce(
				(acc, v) => ({
					...acc,
					[v]: t.tokenBreakdowns[v]
				}),
				{}
			),
			coreTvl: t.tvl,
			tvl: t.tvl + (t.chainTvls?.['OwnTokens'] ?? 0),
			mcap: t.mcap === 0 ? null : t.mcap
		}))
		.sort((a, b) => b.coreTvl - a.coreTvl)
}

export const getEntitiesData = async () => {
	const entities = await fetchJson('https://api.llama.fi/entities')
	return entities
		.map((t) => ({
			...t,
			...['majors', 'others', 'ownTokens', 'stablecoins'].reduce(
				(acc, v) => ({
					...acc,
					[v]: t.tokenBreakdowns[v]
				}),
				{}
			),
			coreTvl: t.tvl,
			tvl: t.tvl + (t.chainTvls?.['OwnTokens'] ?? 0),
			mcap: t.mcap === 0 ? null : t.mcap
		}))
		.sort((a, b) => b.coreTvl - a.coreTvl)
}
