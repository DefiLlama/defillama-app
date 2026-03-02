import { slug } from '~/utils'
import type { IRaisesFilters } from './types'

type RaiseLike = {
	leadInvestors?: Array<string>
	otherInvestors?: Array<string>
	round?: string
	category?: string
	chains?: Array<string>
	amount?: number | null
}

type GetRaisesFiltersListArgs = {
	raises?: Array<RaiseLike>
	investorName?: string | null
}

export function getRaisesFiltersList({ raises, investorName }: GetRaisesFiltersListArgs): IRaisesFilters {
	if (!raises || raises.length === 0)
		return {
			investors: [],
			rounds: [],
			sectors: [],
			chains: []
		}

	const investorSlug = investorName ? slug(investorName.trim().toLowerCase()) : null

	const investors = new Set<string>()
	const rounds = new Set<string>()
	const sectors = new Set<string>()
	const chains = new Set<string>()

	const investorAmounts = new Map<string, number>()
	const roundAmounts = new Map<string, number>()
	const sectorAmounts = new Map<string, number>()
	const chainAmounts = new Map<string, number>()

	const addAmount = (map: Map<string, number>, key: string, amount: number) => {
		map.set(key, (map.get(key) ?? 0) + amount)
	}

	const sortByAmountThenName = (values: Array<string>, amounts: Map<string, number>) => {
		return values.sort((a, b) => {
			const diff = (amounts.get(b) ?? 0) - (amounts.get(a) ?? 0)
			if (diff !== 0) return diff
			return a.localeCompare(b)
		})
	}

	for (const raise of raises) {
		const includeRaise =
			!investorSlug ||
			[...(raise.leadInvestors ?? []), ...(raise.otherInvestors ?? [])].some((inv) => {
				if (!inv) return false
				return slug(inv.trim().toLowerCase()) === investorSlug
			})

		if (!includeRaise) continue

		const amount = typeof raise.amount === 'number' ? raise.amount : 0

		// Only build investors list for the "all raises" page.
		if (!investorSlug) {
			for (const leadInvestor of raise.leadInvestors ?? []) {
				const investor = leadInvestor.trim()
				investors.add(investor)
				addAmount(investorAmounts, investor, amount)
			}

			for (const otherInvestor of raise.otherInvestors ?? []) {
				const investor = otherInvestor.trim()
				investors.add(investor)
				addAmount(investorAmounts, investor, amount)
			}
		}

		if (raise.round) {
			const round = raise.round.trim()
			rounds.add(round)
			addAmount(roundAmounts, round, amount)
		}

		if (raise.category) {
			const sector = raise.category.trim()
			sectors.add(sector)
			addAmount(sectorAmounts, sector, amount)
		}

		for (const chain of raise.chains ?? []) {
			const c = chain?.trim?.() ?? chain
			if (!c) continue
			chains.add(c)
			addAmount(chainAmounts, c, amount)
		}
	}

	return {
		investors: investorSlug ? [] : sortByAmountThenName(Array.from(investors), investorAmounts),
		rounds: sortByAmountThenName(Array.from(rounds), roundAmounts),
		sectors: sortByAmountThenName(Array.from(sectors), sectorAmounts),
		chains: sortByAmountThenName(Array.from(chains), chainAmounts)
	}
}
