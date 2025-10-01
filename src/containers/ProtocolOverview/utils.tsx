import { useQuery } from '@tanstack/react-query'
import { useFetchProtocol } from '~/api/categories/protocols/client'
import type { IChainTvl } from '~/api/types'
import { PEGGEDS_API } from '~/constants'
import type { IRaise, IUpdatedProtocol } from '~/containers/ProtocolOverview/types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { preparePieChartData } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'

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
			: []

	const pieChartData = preparePieChartData({ data: tokenBreakdownPieChart, limit: 15 })

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

	return { ...data, historicalChainTvls: addlProtocolData?.chainTvls ?? null, isLoading: data.isLoading || isLoading }
}

export const getProtocolWarningBanners = (protocolData: IUpdatedProtocol) => {
	// Helper function to check if a date is in valid format
	const isValidDateFormat = (date: any): boolean => {
		if (!date || date === 'forever') return true

		// Check if it's a number (seconds or milliseconds)
		if (typeof date === 'number') {
			const dateObj = new Date(date * 1000)
			return !isNaN(dateObj.getTime())
		}

		// Check if it's a string in YYYY-MM-DD format
		if (typeof date === 'string') {
			const dateObj = new Date(date)
			return !isNaN(dateObj.getTime())
		}

		return false
	}

	const banners = [...(protocolData.warningBanners ?? [])].filter((banner) => {
		if (!banner.until || banner.until === 'forever') {
			return true
		}

		// Validate date format first
		if (!isValidDateFormat(banner.until)) {
			postRuntimeLogs(`Invalid date format for ${protocolData.name} banner`)
			return false
		}

		return new Date(typeof banner.until === 'number' ? banner.until * 1000 : banner.until) > new Date()
	})

	if (protocolData.rugged && protocolData.deadUrl) {
		banners.push({
			message: 'This protocol rug pulled user funds, their website is down.',
			level: 'rug'
		})
	} else {
		if (protocolData.rugged) {
			banners.push({
				message: 'This protocol rug pulled user funds.',
				level: 'rug'
			})
		}
	}
	return banners
}

interface IPeggedAsset {
	id: string
	name: string
	symbol: string
	pegType: string
	pegMechanism: string
}

export const getStablecoinsList = async (): Promise<{ peggedAssets: IPeggedAsset[] }> => {
	try {
		const data = await fetchJson(PEGGEDS_API)
		return data
	} catch (error) {
		postRuntimeLogs(`[ERROR] Failed to fetch stablecoins list: ${error}`)
		return { peggedAssets: [] }
	}
}

export const filterStablecoinsFromTokens = (
	tokens: Record<string, number>,
	stablecoinSymbols: Set<string>
): Record<string, number> => {
	const filteredTokens: Record<string, number> = {}
	for (const token in tokens) {
		if (stablecoinSymbols.has(token)) {
			filteredTokens[token] = tokens[token]
		}
	}
	return filteredTokens
}

export const groupTokensByPegType = (
	tokens: Record<string, number>,
	pegTypeMap: Map<string, string>
): Record<string, number> => {
	const grouped: Record<string, number> = {}
	for (const token in tokens) {
		const pegType = pegTypeMap.get(token)
		if (pegType) {
			grouped[pegType] = (grouped[pegType] || 0) + tokens[token]
		}
	}
	return grouped
}

export const groupTokensByPegMechanism = (
	tokens: Record<string, number>,
	pegMechanismMap: Map<string, string>
): Record<string, number> => {
	const grouped: Record<string, number> = {}
	for (const token in tokens) {
		const pegMechanism = pegMechanismMap.get(token)
		if (pegMechanism) {
			grouped[pegMechanism] = (grouped[pegMechanism] || 0) + tokens[token]
		}
	}
	return grouped
}

export const buildStablecoinChartsData = async ({
	chainTvls,
	extraTvlsEnabled
}: {
	chainTvls: Record<string, any>
	extraTvlsEnabled: Record<string, boolean>
}) => {
	const { peggedAssets } = await getStablecoinsList()

	if (!peggedAssets || peggedAssets.length === 0) {
		return null
	}

	const stablecoinSymbols = new Set(peggedAssets.map((asset) => asset.symbol))
	const pegTypeMap = new Map(peggedAssets.map((asset) => [asset.symbol, asset.pegType]))
	const pegMechanismMap = new Map(peggedAssets.map((asset) => [asset.symbol, asset.pegMechanism]))

	const stablecoinTokensUnique: string[] = []
	const pegTypesUnique = new Set<string>()
	const pegMechanismsUnique = new Set<string>()

	for (const section in chainTvls) {
		const name = section.toLowerCase()
		if (!name.includes('-')) {
			if (Object.keys(extraTvlsEnabled).includes(name) ? extraTvlsEnabled[name] : true) {
				chainTvls[section].tokensInUsd?.forEach((dayTokens) => {
					for (const token in dayTokens.tokens) {
						if (stablecoinSymbols.has(token) && !stablecoinTokensUnique.includes(token)) {
							stablecoinTokensUnique.push(token)
							const pegType = pegTypeMap.get(token)
							const pegMechanism = pegMechanismMap.get(token)
							if (pegType) pegTypesUnique.add(pegType)
							if (pegMechanism) pegMechanismsUnique.add(pegMechanism)
						}
					}
				})
			}
		}
	}

	if (stablecoinTokensUnique.length === 0) {
		return null
	}

	const stablecoinsByPegMechanism: Record<string, any> = {}
	const stablecoinsByPegType: Record<string, any> = {}
	const stablecoinsByToken: Record<string, any> = {}
	const totalStablecoins: Record<string, any> = {}

	for (const section in chainTvls) {
		const name = section.toLowerCase()
		if (!name.includes('-')) {
			if (Object.keys(extraTvlsEnabled).includes(name) ? extraTvlsEnabled[name] : true) {
				chainTvls[section].tokensInUsd?.forEach(({ date, tokens }) => {
					const stablecoinsOnly = filterStablecoinsFromTokens(tokens, stablecoinSymbols)
					const groupedByPegMechanism = groupTokensByPegMechanism(stablecoinsOnly, pegMechanismMap)
					const groupedByPegType = groupTokensByPegType(stablecoinsOnly, pegTypeMap)

					if (!stablecoinsByPegMechanism[date]) {
						stablecoinsByPegMechanism[date] = { date }
					}
					for (const pegMechanism in groupedByPegMechanism) {
						stablecoinsByPegMechanism[date][pegMechanism] =
							(stablecoinsByPegMechanism[date][pegMechanism] || 0) + groupedByPegMechanism[pegMechanism]
					}

					if (!stablecoinsByPegType[date]) {
						stablecoinsByPegType[date] = { date }
					}
					for (const pegType in groupedByPegType) {
						stablecoinsByPegType[date][pegType] = (stablecoinsByPegType[date][pegType] || 0) + groupedByPegType[pegType]
					}

					if (!stablecoinsByToken[date]) {
						stablecoinsByToken[date] = { date }
					}
					for (const token in stablecoinsOnly) {
						stablecoinsByToken[date][token] = (stablecoinsByToken[date][token] || 0) + stablecoinsOnly[token]
					}

					const total = Object.values(stablecoinsOnly).reduce((acc, val) => acc + val, 0)
					totalStablecoins[date] = (totalStablecoins[date] || 0) + total
				})
			}
		}
	}

	const stablecoinsByPegMechanismArray = Object.values(stablecoinsByPegMechanism).sort((a, b) => a.date - b.date)
	const stablecoinsByPegTypeArray = Object.values(stablecoinsByPegType).sort((a, b) => a.date - b.date)
	const stablecoinsByTokenArray = Object.values(stablecoinsByToken).sort((a, b) => a.date - b.date)
	const totalStablecoinsArray = Object.entries(totalStablecoins)
		.map(([date, value]) => ({ date: Number(date), value }))
		.sort((a, b) => a.date - b.date)

	const latestByPegMechanism = stablecoinsByPegMechanismArray[stablecoinsByPegMechanismArray.length - 1]
	const pegMechanismPieChart = latestByPegMechanism
		? Object.entries(latestByPegMechanism)
				.filter(([key]) => key !== 'date')
				.map(([name, value]) => ({ name, value }))
		: []

	const pieChartDataByPegMechanism = preparePieChartData({ data: pegMechanismPieChart, limit: 10 })

	const latestByPegType = stablecoinsByPegTypeArray[stablecoinsByPegTypeArray.length - 1]
	const pegTypePieChart = latestByPegType
		? Object.entries(latestByPegType)
				.filter(([key]) => key !== 'date')
				.map(([name, value]) => ({ name, value }))
		: []

	const pieChartDataByPegType = preparePieChartData({ data: pegTypePieChart, limit: 10 })

	return {
		stablecoinsByPegMechanism: stablecoinsByPegMechanismArray.length > 0 ? stablecoinsByPegMechanismArray : null,
		stablecoinsByPegType: stablecoinsByPegTypeArray.length > 0 ? stablecoinsByPegTypeArray : null,
		stablecoinsByToken: stablecoinsByTokenArray.length > 0 ? stablecoinsByTokenArray : null,
		totalStablecoins: totalStablecoinsArray.length > 0 ? totalStablecoinsArray : null,
		pegMechanismPieChart: pieChartDataByPegMechanism,
		pegTypePieChart: pieChartDataByPegType,
		stablecoinTokensUnique,
		pegTypesUnique: Array.from(pegTypesUnique),
		pegMechanismsUnique: Array.from(pegMechanismsUnique)
	}
}
