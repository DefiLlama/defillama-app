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

// build unique tokens based on top 10 tokens in usd value on each day
function getUniqueTokens({ chainTvls, extraTvlsEnabled }) {
	const tokenSet: Set<string> = new Set()

	let othersCategoryExist = false

	for (const section in chainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-')) {
			// sum key with staking, ethereum, arbitrum etc
			if (Object.keys(extraTvlsEnabled).includes(name) ? extraTvlsEnabled[name] : true) {
				chainTvls[section].tokensInUsd?.forEach((dayTokens) => {
					// filters tokens that have no name or their value is near zero and pick top 10 tokens from the list
					const topTokens = Object.entries(dayTokens.tokens)
						.filter((t) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))
						.sort((a: [string, number], b: [string, number]) => b[1] - a[1])

					if (topTokens.length > 10) {
						othersCategoryExist = true
					}

					topTokens.slice(0, 11).forEach(([symbol]) => tokenSet.add(symbol))
				})

				// if 'others' exist, add it to the end of unique token list
				if (othersCategoryExist) {
					tokenSet.add('Others')
				}
			}
		}
	}

	return Array.from(tokenSet)
}

function buildInflows({ chainTvls, extraTvlsEnabled, tokensUnique }) {
	const usdInflows = {}
	const tokenInflows = {}

	let zeroUsdInfows = 0
	let zeroTokenInfows = 0

	for (const section in chainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-')) {
			// sum key with staking, ethereum, arbitrum etc
			if (Object.keys(extraTvlsEnabled).includes(name) ? extraTvlsEnabled[name] : true) {
				const tokensInUsd = chainTvls[section].tokensInUsd || []
				const tokens = chainTvls[section].tokens || []

				for (let i = 1; i < tokensInUsd.length; i++) {
					let dayDifference = 0
					let tokenDayDifference = {}

					for (const token in tokensInUsd[i]?.tokens) {
						const price = tokensInUsd[i].tokens[token] / tokens[i]?.tokens[token]
						const diff = (tokens[i]?.tokens[token] ?? 0) - (tokens[i - 1]?.tokens[token] ?? 0)
						const diffUsd = price * diff

						if (!Number.isNaN(diffUsd) && isFinite(price)) {
							// Show only top 10 inflow tokens of the day, add remaining inlfows under "Others" category
							if (tokensUnique.includes(token)) {
								tokenDayDifference[token] = (tokenDayDifference[token] || 0) + diffUsd
							} else {
								tokenDayDifference['Others'] = (tokenDayDifference['Others'] || 0) + diffUsd
							}

							dayDifference += diffUsd
						}
					}

					if (dayDifference === 0) {
						zeroUsdInfows++
					}

					if (Object.keys(tokenDayDifference)?.length === 0) {
						zeroTokenInfows++
					}

					const date = tokensInUsd[i].date

					usdInflows[date] = (usdInflows[date] || 0) + dayDifference

					if (!tokenInflows[date]) {
						tokenInflows[date] = { date }
					}

					for (const token in tokenInflows[date]) {
						if (token !== 'date') {
							tokenDayDifference[token] = (tokenDayDifference[token] || 0) + tokenInflows[date][token]
						}
					}

					tokenInflows[date] = { ...tokenInflows[date], ...tokenDayDifference }
				}
			}
		}
	}

	const usdFlows = Object.entries(usdInflows)
	const tokenFlows = Object.values(tokenInflows)

	return {
		usdInflows: zeroUsdInfows === usdFlows.length ? null : usdFlows,
		tokenInflows: zeroTokenInfows === tokenFlows.length ? null : tokenFlows
	}
}

function storeTokensBreakdown({ date, tokens, tokensUnique, directory }) {
	// filters tokens that have no name or their value is near zero
	const tokensOfTheDay = Object.entries(tokens).filter((t) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))

	const tokensToShow = []
	let remainingTokensSum = 0

	// split tokens of the day into tokens present in top 10 tokens list and add tvl of remaining tokens into category named 'Others'
	tokensOfTheDay.forEach((token: [string, number]) => {
		if (tokensUnique.includes(token[0])) {
			tokensToShow.push(token)
		} else {
			remainingTokensSum += token[1]
		}
	})

	// add "Others" to tokens list
	if (tokensUnique.includes('Others') && remainingTokensSum > 0) {
		tokensToShow.push(['Others', remainingTokensSum])
	}

	if (!directory[date]) {
		directory[date] = { date }
	}

	const sumOfAllTokensInThisDate = Object.fromEntries(tokensToShow)

	for (const token in directory[date]) {
		if (token !== 'date') {
			sumOfAllTokensInThisDate[token] = (sumOfAllTokensInThisDate[token] || 0) + directory[date][token]
		}
	}

	directory[date] = { ...directory[date], ...sumOfAllTokensInThisDate }
}

function buildTokensBreakdown({ chainTvls, extraTvlsEnabled, tokensUnique }) {
	const tokensInUsd = {}
	const rawTokens = {}

	for (const section in chainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-')) {
			// sum key with staking, ethereum, arbitrum etc
			if (Object.keys(extraTvlsEnabled).includes(name) ? extraTvlsEnabled[name] : true) {
				chainTvls[section].tokensInUsd?.forEach(
					({ date, tokens }: { date: number; tokens: { [token: string]: number } }) => {
						storeTokensBreakdown({ date, tokens, tokensUnique, directory: tokensInUsd })
					}
				)

				chainTvls[section].tokens?.forEach(
					({ date, tokens }: { date: number; tokens: { [token: string]: number } }) => {
						storeTokensBreakdown({ date, tokens, tokensUnique, directory: rawTokens })
					}
				)
			}
		}
	}

	const tokenBreakdownUSD = Object.values(tokensInUsd)

	const tokenBreakdownPieChart =
		tokenBreakdownUSD.length > 0
			? Object.entries(tokenBreakdownUSD[tokenBreakdownUSD.length - 1])
					.filter((values) => values[0] !== 'date')
					.map(([name, value]) => ({ name, value }))
			: []

	return { tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown: Object.values(rawTokens) }
}

export const buildProtocolAddlChartsData = ({ protocolData, extraTvlsEnabled }) => {
	if (protocolData) {
		if (!protocolData.misrepresentedTokens && protocolData.tokensInUsd && protocolData.tokens) {
			const tokensUnique = getUniqueTokens({ chainTvls: protocolData.chainTvls, extraTvlsEnabled })

			const { tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown } = buildTokensBreakdown({
				chainTvls: protocolData.chainTvls,
				extraTvlsEnabled,
				tokensUnique
			})

			const { usdInflows, tokenInflows } = buildInflows({
				chainTvls: protocolData.chainTvls,
				extraTvlsEnabled,
				tokensUnique
			})

			return {
				tokensUnique,
				tokenBreakdownUSD,
				tokenBreakdownPieChart,
				tokenBreakdown,
				usdInflows,
				tokenInflows
			}
		}

		return {}
	}

	return {}
}
