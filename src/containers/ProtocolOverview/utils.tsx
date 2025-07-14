import { useQuery } from '@tanstack/react-query'
import { useFetchProtocol } from '~/api/categories/protocols/client'
import type { IChainTvl } from '~/api/types'
import type { IRaise } from '~/containers/ProtocolOverview/types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'

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
						.filter((t: [string, number]) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))
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

			if (tokenSet.size === 0) {
				if (Object.keys(extraTvlsEnabled).includes(name) ? extraTvlsEnabled[name] : true) {
					chainTvls[section].tokens?.forEach((dayTokens) => {
						// filters tokens that have no name or their value is near zero and pick top 10 tokens from the list
						const topTokens = Object.entries(dayTokens.tokens)
							.filter((t: [string, number]) => !(t[0].startsWith('UNKNOWN') && t[1] < 1))
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
	}

	return Array.from(tokenSet)
}

function buildInflows({ chainTvls, extraTvlsEnabled, tokensUnique, datesToDelete }) {
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
				const tokensInUsd = Object.fromEntries(
					chainTvls[section]?.tokensInUsd?.map(({ date, tokens }) => [date, tokens]) ?? []
				)
				const tokens = Object.fromEntries(chainTvls[section]?.tokens?.map(({ date, tokens }) => [date, tokens]) ?? [])

				let prevDate = null

				for (const date in tokensInUsd) {
					let dayDifference = 0
					let tokenDayDifference = {}

					for (const token in tokensInUsd[date]) {
						const price = tokens[date]?.[token]
							? Number((tokensInUsd[date][token] / tokens[date][token]).toFixed(4))
							: null

						const diff =
							tokens[date]?.[token] && prevDate && tokens[prevDate]?.[token]
								? tokens[date][token] - tokens[prevDate][token]
								: null

						const diffUsd = price && diff ? price * diff : null

						if (diffUsd && !Number.isNaN(diffUsd) && isFinite(price)) {
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

					prevDate = date
				}
			}
		}
	}

	datesToDelete.forEach((date) => {
		delete usdInflows[date]
		delete tokenInflows[date]
	})

	const usdFlows = Object.entries(usdInflows)
	const tokenFlows = Object.values(tokenInflows)

	return {
		usdInflows: (zeroUsdInfows === usdFlows.length ? null : usdFlows) as Array<[string, number]> | null,
		tokenInflows: zeroTokenInfows === tokenFlows.length ? null : tokenFlows
	}
}

function storeTokensBreakdown({ date, tokens, tokensUnique, directory }) {
	const tokensOfTheDay = {}
	// filters tokens that have no name or their value is near zero
	for (const token in tokens) {
		if (!(token.startsWith('UNKNOWN') && tokens[token] < 1)) {
			tokensOfTheDay[token] = tokens[token]
		}
	}

	const tokensToShow = {}
	let remainingTokensSum = 0

	// split tokens of the day into tokens present in top 10 tokens list and add tvl of remaining tokens into category named 'Others'
	for (const token in tokensOfTheDay) {
		if (tokensUnique.includes(token)) {
			tokensToShow[token] = tokensOfTheDay[token]
		} else {
			remainingTokensSum += tokensOfTheDay[token]
		}
	}

	// add "Others" to tokens list
	if (tokensUnique.includes('Others') && remainingTokensSum > 0) {
		tokensToShow['Others'] = remainingTokensSum
	}

	const dir = { date, ...(directory[date] ?? {}) }

	for (const token in tokensToShow) {
		dir[token] = (dir[token] || 0) + tokensToShow[token]
	}

	directory[date] = dir
}

function buildTokensBreakdown({ chainTvls, extraTvlsEnabled, tokensUnique }) {
	const tokensInUsd = {}
	const rawTokens = {}

	for (const chain in chainTvls) {
		const name = chain.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-')) {
			// sum key with staking, ethereum, arbitrum etc
			if (Object.keys(extraTvlsEnabled).includes(name) ? extraTvlsEnabled[name] : true) {
				for (const { date, tokens } of chainTvls[chain].tokensInUsd ?? []) {
					storeTokensBreakdown({ date, tokens, tokensUnique, directory: tokensInUsd })
				}

				for (const { date, tokens } of chainTvls[chain].tokens ?? []) {
					storeTokensBreakdown({ date, tokens, tokensUnique, directory: rawTokens })
				}
			}
		}
	}

	const tokenBreakdownUSD = Object.values(tokensInUsd)

	const tokenBreakdownPieChart =
		tokenBreakdownUSD.length > 0
			? Object.entries(tokenBreakdownUSD[tokenBreakdownUSD.length - 1])
					.filter((values) => values[0] !== 'date')
					.map(([name, value]) => ({ name, value }))
					.sort((a, b) => b.value - a.value)
			: []

	const pieChartData = []

	let othersDataInPieChart = 0

	tokenBreakdownPieChart.forEach((token, index) => {
		if (index < 15 && token.name !== 'Others') {
			pieChartData.push(token)
		} else {
			othersDataInPieChart += token.value
		}
	})

	if (othersDataInPieChart) {
		pieChartData.push({ name: 'Others', value: othersDataInPieChart })
	}

	return { tokenBreakdownUSD, tokenBreakdownPieChart: pieChartData, tokenBreakdown: Object.values(rawTokens) }
}

export const buildProtocolAddlChartsData = ({
	protocolData,
	extraTvlsEnabled
}: {
	protocolData: { name: string; chainTvls?: IChainTvl; misrepresentedTokens?: boolean }
	extraTvlsEnabled: Record<string, boolean>
}) => {
	if (protocolData) {
		let tokensInUsdExsists = false
		let tokensExists = false

		Object.values(protocolData.chainTvls ?? {}).forEach((chain) => {
			if (!tokensInUsdExsists && chain.tokensInUsd && chain.tokensInUsd.length > 0) {
				tokensInUsdExsists = true
			}

			if (!tokensExists && chain.tokens && chain.tokens.length > 0) {
				tokensExists = true
			}
		})

		if (!protocolData.misrepresentedTokens && (tokensInUsdExsists || tokensExists)) {
			const tokensUnique = getUniqueTokens({ chainTvls: protocolData.chainTvls, extraTvlsEnabled })

			const { tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown } = buildTokensBreakdown({
				chainTvls: protocolData.chainTvls ?? {},
				extraTvlsEnabled,
				tokensUnique
			})

			const { usdInflows, tokenInflows } = buildInflows({
				chainTvls: protocolData.chainTvls ?? {},
				extraTvlsEnabled,
				tokensUnique,
				datesToDelete: protocolData.name === 'Binance CEX' ? [1681430400, 1681516800] : []
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

export const formatRaise = (raise: Omit<IRaise, 'defillamaId'>) => {
	let text = ''

	if (raise.round) {
		text += ` ${raise.round}`
	}

	if (raise.round && raise.amount) {
		text += ' -'
	}

	if (raise.amount) {
		text += ` Raised ${formatRaisedAmount(Number(raise.amount))}`
	}

	if (raise.valuation && Number(raise.valuation)) {
		text += ` at ${formatRaisedAmount(Number(raise.valuation))} valuation`
	}

	return text
}

export const formatRaisedAmount = (n: number) => {
	if (n === 0) return null

	if (n >= 1e3) {
		return `$${(n / 1e3).toLocaleString(undefined, { maximumFractionDigits: 2 })}b`
	}
	return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}m`
}

export const useFetchProtocolAddlChartsData = (protocolName) => {
	const { data: addlProtocolData, isLoading } = useFetchProtocol(protocolName)
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const data = useQuery({
		queryKey: [
			'protocols-addl-chart-data',
			protocolName,
			addlProtocolData ? true : false,
			JSON.stringify(extraTvlsEnabled)
		],
		queryFn: () => buildProtocolAddlChartsData({ protocolData: addlProtocolData as any, extraTvlsEnabled }),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000
	})

	return { ...data, isLoading: data.isLoading || isLoading }
}
