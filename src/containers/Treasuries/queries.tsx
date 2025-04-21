import { PROTOCOLS_TREASURY } from '~/constants'
import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const getTreasuryData = async () => {
	const treasuries = await fetch(PROTOCOLS_TREASURY).then((res) => res.json())
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
	const entities = await fetch('https://api.llama.fi/entities').then((res) => res.json())
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
