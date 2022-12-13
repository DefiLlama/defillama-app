// build unique tokens based on top 10 tokens in usd value on each day
function getUniqueTokens(tokensInUsd) {
	const tokenSet: Set<string> = new Set()
	let othersCategoryExist = false
	tokensInUsd.forEach((dayTokens) => {
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

	return Array.from(tokenSet)
}

function buildTokensBreakdown(tokensInUsd, tokensUnique: Array<string>) {
	const stacked = tokensInUsd.map((dayTokens) => {
		// filters tokens that have no name or their value is near zero
		const tokensOfTheDay = Object.entries(dayTokens.tokens).filter((t) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))

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

		return {
			...Object.fromEntries(tokensToShow),
			date: dayTokens.date
		}
	})
	return stacked
}

function buildInflows({ tokensInUsd, tokens, tokensUnique }) {
	const usdInflows = []
	const tokenInflows = []

	let zeroUsdInfows = 0
	let zeroTokenInfows = 0

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
					tokenDayDifference[token] = diffUsd
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

		usdInflows.push([tokensInUsd[i].date, dayDifference])

		tokenInflows.push({
			...tokenDayDifference,
			date: tokensInUsd[i].date
		})
	}

	return {
		usdInflows: zeroUsdInfows === usdInflows.length ? null : usdInflows,
		tokenInflows: zeroTokenInfows === tokenInflows.length ? null : tokenInflows
	}
}

export const buildProtocolData = (protocolData) => {
	if (protocolData) {
		if (!protocolData.misrepresentedTokens && protocolData.tokensInUsd && protocolData.tokens) {
			const tokensUnique = getUniqueTokens(protocolData.tokensInUsd)
			const tokenBreakdownUSD = buildTokensBreakdown(protocolData.tokensInUsd, tokensUnique)
			const tokenBreakdown = buildTokensBreakdown(protocolData.tokens, tokensUnique)
			const { usdInflows, tokenInflows } = buildInflows({
				tokensInUsd: protocolData.tokensInUsd,
				tokens: protocolData.tokens,
				tokensUnique
			})

			return {
				tokensUnique,
				tokenBreakdownUSD,
				tokenBreakdown,
				usdInflows,
				tokenInflows
			}
		}

		return {}
	}

	return {}
}
