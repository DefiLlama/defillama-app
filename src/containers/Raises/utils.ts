interface IRaisesFilters {
	investors: Array<string>
	rounds: Array<string>
	sectors: Array<string>
	chains: Array<string>
}

export function getRaisesFiltersList(data): IRaisesFilters {
	if (!data)
		return {
			investors: [],
			rounds: [],
			sectors: [],
			chains: []
		}

	const investors = new Set<string>()
	const rounds = new Set<string>()
	const sectors = new Set<string>()
	const chains = new Set<string>()

	for (const raise of data.raises) {
		for (const leadInvestor of raise.leadInvestors ?? []) {
			investors.add(leadInvestor.trim())
		}

		for (const otherInvestor of raise.otherInvestors ?? []) {
			investors.add(otherInvestor.trim())
		}

		if (raise.round) {
			rounds.add(raise.round.trim())
		}

		if (raise.category) {
			sectors.add(raise.category.trim())
		}

		for (const chain of raise.chains ?? []) {
			chains.add(chain)
		}
	}

	return {
		investors: Array.from(investors).sort(),
		rounds: Array.from(rounds).sort(),
		sectors: Array.from(sectors).sort(),
		chains: Array.from(chains).sort()
	}
}
