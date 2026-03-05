import { slug } from '~/utils'
import { fetchEntities, fetchTreasuries } from './api'
import type { RawTreasuryProtocol } from './api.types'
import type { INetProjectTreasury, ITreasuryRow } from './types'

function transformTreasury(t: RawTreasuryProtocol): ITreasuryRow {
	const tb = t.tokenBreakdowns ?? {
		ownTokens: 0,
		stablecoins: 0,
		majors: 0,
		others: 0
	}

	return {
		...t,
		tokenBreakdowns: tb,
		ownTokens: tb.ownTokens,
		stablecoins: tb.stablecoins,
		majors: tb.majors,
		others: tb.others,
		coreTvl: t.tvl,
		tvl: t.tvl + (t.chainTvls?.['OwnTokens'] ?? 0),
		mcap: t.mcap === 0 ? null : t.mcap
	}
}

export async function getTreasuryPageData(): Promise<ITreasuryRow[]> {
	const treasuries = await fetchTreasuries()
	return treasuries.map(transformTreasury).sort((a, b) => b.coreTvl - a.coreTvl)
}

export async function getEntitiesPageData(): Promise<ITreasuryRow[]> {
	const entities = await fetchEntities()
	return entities.map(transformTreasury).sort((a, b) => b.coreTvl - a.coreTvl)
}

export async function getNetProjectTreasuryData(): Promise<INetProjectTreasury[]> {
	const treasuries = await fetchTreasuries()

	const protocols: INetProjectTreasury[] = treasuries
		.map((t) => {
			const netTreasury = Object.entries(t.tokenBreakdowns ?? {}).reduce((sum, [category, value]) => {
				if (category === 'ownTokens') return sum
				return sum + (Number.isFinite(value) ? value : 0)
			}, 0)
			const name = t.name.replace(' (treasury)', '')
			return {
				name,
				logo: `${t.logo.replace('https://icons.llama.fi', 'https://icons.llamao.fi/icons/protocols')}?w=48&h=48`,
				slug: slug(name),
				netTreasury
			}
		})
		.filter((t) => t.netTreasury > 0)
		.sort((a, b) => b.netTreasury - a.netTreasury)

	return protocols
}
