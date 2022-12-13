export const formatTvlsByChain = ({ historicalChainTvls, extraTvlsEnabled }) => {
	const tvlDictionary: { [data: number]: { [chain: string]: number } } = {}

	for (const section in historicalChainTvls) {
		let sectionName = section
		const name = section.toLowerCase()

		let toSumSection = false

		// sum keys like ethereum-staking, arbitrum-vesting only if chain is present
		if (name.includes('-')) {
			const formattedName = name.split('-')

			if (extraTvlsEnabled[formattedName[1]]) {
				toSumSection = true

				sectionName = section.split('-').slice(0, -1).join('-')
			}
		} else {
			// sum key with staking, ethereum, arbitrum etc but ethereum-staking, arbitrum-vesting
			if (!Object.keys(extraTvlsEnabled).includes(name)) {
				toSumSection = true
			}
		}

		if (toSumSection) {
			historicalChainTvls[section].tvl?.forEach(
				({ date, totalLiquidityUSD }: { date: number; totalLiquidityUSD: number }) => {
					if (!tvlDictionary[date]) {
						tvlDictionary[date] = { [sectionName]: 0 }
					}

					tvlDictionary[date] = {
						...tvlDictionary[date],
						[sectionName]: (tvlDictionary[date][sectionName] || 0) + totalLiquidityUSD
					}
				}
			)
		}
	}

	return Object.entries(tvlDictionary).map(([date, values]) => ({ ...values, date: Number(date) }))
}
