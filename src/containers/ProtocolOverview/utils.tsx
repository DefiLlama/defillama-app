import { useMemo } from 'react'
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
			if (!(name in extraTvlsEnabled)) {
				toSumSection = true
			}
		}

		if (toSumSection) {
			const tvl = historicalChainTvls[section].tvl
			if (tvl) {
				for (const { date, totalLiquidityUSD } of tvl) {
					if (!tvlDictionary[date]) {
						tvlDictionary[date] = { [sectionName]: 0 }
					}

					tvlDictionary[date][sectionName] = (tvlDictionary[date][sectionName] || 0) + totalLiquidityUSD
				}
			}
		}
	}

	const result = []
	for (const date in tvlDictionary) {
		result.push({ ...tvlDictionary[date], date: Number(date) })
	}
	result.sort((a, b) => a.date - b.date)
	return result
}

// build unique tokens based on top 10 tokens in usd value on each day
// also includes tokens with significant flows (outflows/inflows > $100M)
function getUniqueTokens({ chainTvls, extraTvlsEnabled }) {
	const tokenSet: Set<string> = new Set()
	const tokenFlows: Map<string, number> = new Map()
	const SIGNIFICANT_FLOW_THRESHOLD = 100_000_000 // $100M

	// Helper function to get top 10 tokens without full sort (partial sort)
	// Returns [topTokens, totalTokenCount]
	const getTop10Tokens = (tokens: Record<string, number>): [Array<[string, number]>, number] => {
		const validTokens: Array<[string, number]> = []
		let totalCount = 0

		for (const token in tokens) {
			totalCount++
			if (!(token.startsWith('UNKNOWN') && tokens[token] < 1)) {
				validTokens.push([token, tokens[token]])
			}
		}

		if (validTokens.length <= 10) {
			validTokens.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
			return [validTokens, totalCount]
		}

		// Partial sort: only sort top 10, more efficient than full sort
		validTokens.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
		return [validTokens.slice(0, 10), totalCount]
	}

	for (const section in chainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (name.includes('-')) continue

		// Check if section is enabled
		const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
		if (!isEnabled) continue

		const tokensInUsd = chainTvls[section].tokensInUsd ?? []
		const tokens = chainTvls[section].tokens ?? []
		let othersCategoryExist = false

		// First pass: collect tokens based on top 10 values
		if (tokensInUsd.length > 0) {
			for (const dayTokens of tokensInUsd) {
				const [topTokens, tokenCount] = getTop10Tokens(dayTokens.tokens)

				if (tokenCount > 10) {
					othersCategoryExist = true
				}

				for (let i = 0; i < topTokens.length && i < 10; i++) {
					tokenSet.add(topTokens[i][0])
				}
			}
		}

		// Second pass: calculate flows to identify tokens with significant flows
		// Only calculate flows if we have both tokensInUsd and tokens data
		if (tokensInUsd.length > 0 && tokens.length > 0) {
			// Build maps more efficiently (single pass)
			const tokensInUsdMap: Record<string, Record<string, number>> = {}
			const tokensMap: Record<string, Record<string, number>> = {}

			for (const { date, tokens: tokenData } of tokensInUsd) {
				tokensInUsdMap[date] = tokenData
			}

			for (const { date, tokens: tokenData } of tokens) {
				tokensMap[date] = tokenData
			}

			// Process dates in order (assuming arrays are already sorted by date)
			// If not sorted, we'll sort only once
			const dates: string[] = []
			for (const { date } of tokensInUsd) {
				dates.push(String(date))
			}
			if (dates.length > 1) {
				// Check if dates are already sorted
				let isSorted = true
				for (let i = 1; i < dates.length; i++) {
					if (Number(dates[i]) < Number(dates[i - 1])) {
						isSorted = false
						break
					}
				}

				if (!isSorted) {
					dates.sort((a, b) => Number(a) - Number(b))
				}

				let prevDate: string | null = null
				for (const date of dates) {
					if (prevDate === null) {
						prevDate = date
						continue
					}

					const currTokensUsd = tokensInUsdMap[date]
					const currTokens = tokensMap[date]
					const prevTokens = tokensMap[prevDate]

					if (!currTokensUsd || !currTokens || !prevTokens) {
						prevDate = date
						continue
					}

					for (const token in currTokensUsd) {
						const currAmount = currTokens[token]
						const prevAmount = prevTokens[token]

						if (!currAmount || !prevAmount || currAmount === 0) continue

						const price = currTokensUsd[token] / currAmount
						if (!isFinite(price)) continue

						const diff = currAmount - prevAmount
						const diffUsd = price * diff

						if (isFinite(diffUsd) && !Number.isNaN(diffUsd)) {
							const currentFlow = tokenFlows.get(token) || 0
							tokenFlows.set(token, currentFlow + Math.abs(diffUsd))
						}
					}

					prevDate = date
				}
			}
		}

		// if tokensInUsd is empty, build unique tokens from tokens
		if (tokenSet.size === 0 && tokens.length > 0) {
			for (const dayTokens of tokens) {
				const [topTokens, tokenCount] = getTop10Tokens(dayTokens.tokens)

				if (tokenCount > 10) {
					othersCategoryExist = true
				}

				for (let i = 0; i < topTokens.length && i < 10; i++) {
					tokenSet.add(topTokens[i][0])
				}
			}
		}

		// if 'others' exist, add it to the end of unique token list
		if (othersCategoryExist) {
			tokenSet.add('Others')
		}
	}

	// Add tokens with significant flows (> $100M) to the token set
	for (const [token, totalFlow] of tokenFlows) {
		if (totalFlow >= SIGNIFICANT_FLOW_THRESHOLD && !token.startsWith('UNKNOWN')) {
			tokenSet.add(token)
		}
	}

	return Array.from(tokenSet)
}

function buildInflows({ chainTvls, extraTvlsEnabled, tokensUnique, datesToDelete }) {
	const usdInflows = {}
	const tokenInflows = {}

	const tokensUniqueSet = new Set(tokensUnique)

	let zeroUsdInfows = 0
	let zeroTokenInfows = 0

	for (const section in chainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-')) {
			// sum key with staking, ethereum, arbitrum etc
			const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
			if (isEnabled) {
				const tokensInUsd: Record<string, Record<string, number>> = {}
				const tokensData: Record<string, Record<string, number>> = {}

				const tokensInUsdArray = chainTvls[section]?.tokensInUsd ?? []
				for (const { date, tokens } of tokensInUsdArray) {
					tokensInUsd[date] = tokens
				}

				const tokensArray = chainTvls[section]?.tokens ?? []
				for (const { date, tokens } of tokensArray) {
					tokensData[date] = tokens
				}

				const tokens = tokensData

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
							if (tokensUniqueSet.has(token)) {
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

					let hasTokenDifference = false
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					for (const _ in tokenDayDifference) {
						hasTokenDifference = true
						break
					}
					if (!hasTokenDifference) {
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

					for (const token in tokenDayDifference) {
						tokenInflows[date][token] = tokenDayDifference[token]
					}

					prevDate = date
				}
			}
		}
	}

	for (const date of datesToDelete) {
		delete usdInflows[date]
		delete tokenInflows[date]
	}

	const usdFlows: Array<[string, number]> = []
	for (const date in usdInflows) {
		usdFlows.push([date, usdInflows[date]])
	}
	usdFlows.sort((a, b) => Number(a[0]) - Number(b[0]))

	const tokenFlows = []
	for (const date in tokenInflows) {
		tokenFlows.push(tokenInflows[date])
	}
	tokenFlows.sort((a, b) => a.date - b.date)

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

	const tokensUniqueSet = new Set(tokensUnique)

	const tokensToShow = {}
	let remainingTokensSum = 0

	// split tokens of the day into tokens present in top 10 tokens list and add tvl of remaining tokens into category named 'Others'
	for (const token in tokensOfTheDay) {
		if (tokensUniqueSet.has(token)) {
			tokensToShow[token] = tokensOfTheDay[token]
		} else {
			remainingTokensSum += tokensOfTheDay[token]
		}
	}

	// add "Others" to tokens list
	if (tokensUniqueSet.has('Others') && remainingTokensSum > 0) {
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
			const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
			if (isEnabled) {
				for (const { date, tokens } of chainTvls[chain].tokensInUsd ?? []) {
					storeTokensBreakdown({ date, tokens, tokensUnique, directory: tokensInUsd })
				}

				for (const { date, tokens } of chainTvls[chain].tokens ?? []) {
					storeTokensBreakdown({ date, tokens, tokensUnique, directory: rawTokens })
				}
			}
		}
	}

	const tokenBreakdownUSD = []
	for (const date in tokensInUsd) {
		tokenBreakdownUSD.push(tokensInUsd[date])
	}
	tokenBreakdownUSD.sort((a, b) => a.date - b.date)

	const tokenBreakdownPieChart = []
	if (tokenBreakdownUSD.length > 0) {
		const lastEntry = tokenBreakdownUSD[tokenBreakdownUSD.length - 1]
		for (const name in lastEntry) {
			if (name !== 'date') {
				tokenBreakdownPieChart.push({ name, value: lastEntry[name] })
			}
		}
	}

	const pieChartData = preparePieChartData({ data: tokenBreakdownPieChart, limit: 15 })

	const tokenBreakdown = []
	for (const date in rawTokens) {
		tokenBreakdown.push(rawTokens[date])
	}
	tokenBreakdown.sort((a, b) => a.date - b.date)

	return { tokenBreakdownUSD, tokenBreakdownPieChart: pieChartData, tokenBreakdown }
}

export const buildProtocolAddlChartsData = ({
	protocolData,
	extraTvlsEnabled,
	isBorrowed
}: {
	protocolData: { name: string; chainTvls?: IChainTvl; misrepresentedTokens?: boolean }
	extraTvlsEnabled: Record<string, boolean>
	isBorrowed?: boolean
}) => {
	let chainTvls = protocolData.chainTvls ?? {}
	if (isBorrowed) {
		chainTvls = {}
		for (const chain in protocolData.chainTvls ?? {}) {
			if (chain.endsWith('-borrowed')) {
				const chainName = chain.split('-')[0]
				chainTvls[chainName] = protocolData.chainTvls[chain]
			}
		}
	}

	if (protocolData) {
		let tokensInUsdExsists = false
		let tokensExists = false

		for (const chain in chainTvls) {
			const chainData = chainTvls[chain]
			if (!tokensInUsdExsists && chainData.tokensInUsd && chainData.tokensInUsd.length > 0) {
				tokensInUsdExsists = true
			}

			if (!tokensExists && chainData.tokens && chainData.tokens.length > 0) {
				tokensExists = true
			}
		}

		if (!protocolData.misrepresentedTokens && (tokensInUsdExsists || tokensExists)) {
			const tokensUnique = getUniqueTokens({ chainTvls: chainTvls, extraTvlsEnabled })

			const { tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown } = buildTokensBreakdown({
				chainTvls: chainTvls,
				extraTvlsEnabled,
				tokensUnique
			})

			const { usdInflows, tokenInflows } = buildInflows({
				chainTvls: chainTvls,
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

export const useFetchProtocolAddlChartsData = (protocolName, isBorrowed = false) => {
	const { data: addlProtocolData, isLoading } = useFetchProtocol(protocolName)
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const data = useQuery({
		queryKey: [
			'protocols-addl-chart-data',
			protocolName,
			addlProtocolData ? true : false,
			isBorrowed ? 'borrowed' : JSON.stringify(extraTvlsEnabled)
		],
		queryFn: () =>
			buildProtocolAddlChartsData({
				protocolData: addlProtocolData as any,
				extraTvlsEnabled: isBorrowed ? {} : extraTvlsEnabled,
				isBorrowed
			}),
		staleTime: 60 * 60 * 1000,
		refetchInterval: 10 * 60 * 1000
	})

	const historicalChainTvls = useMemo(() => {
		if (isBorrowed) {
			const chainTvls = {}
			for (const chain in addlProtocolData?.chainTvls ?? {}) {
				if (chain.endsWith('-borrowed')) {
					const chainName = chain.split('-')[0]
					chainTvls[chainName] = addlProtocolData?.chainTvls[chain]
				}
			}
			return chainTvls
		}
		return addlProtocolData?.chainTvls ?? null
	}, [addlProtocolData, isBorrowed])

	return { ...data, historicalChainTvls, isLoading: data.isLoading || isLoading }
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

	const warningBanners = protocolData.warningBanners ?? []
	const banners = []
	for (const banner of warningBanners) {
		if (!banner.until || banner.until === 'forever') {
			banners.push(banner)
			continue
		}

		// Validate date format first
		if (!isValidDateFormat(banner.until)) {
			postRuntimeLogs(`Invalid date format for ${protocolData.name} banner`)
			continue
		}

		if (new Date(typeof banner.until === 'number' ? banner.until * 1000 : banner.until) > new Date()) {
			banners.push(banner)
		}
	}

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

	const stablecoinSymbols = new Set<string>()
	const pegTypeMap = new Map<string, string>()
	const pegMechanismMap = new Map<string, string>()

	for (const asset of peggedAssets) {
		stablecoinSymbols.add(asset.symbol)
		pegTypeMap.set(asset.symbol, asset.pegType)
		pegMechanismMap.set(asset.symbol, asset.pegMechanism)
	}

	const stablecoinTokensUniqueSet = new Set<string>()
	const pegTypesUnique = new Set<string>()
	const pegMechanismsUnique = new Set<string>()

	for (const section in chainTvls) {
		const name = section.toLowerCase()
		if (!name.includes('-')) {
			const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
			if (isEnabled) {
				const tokensInUsd = chainTvls[section].tokensInUsd
				if (tokensInUsd) {
					for (const dayTokens of tokensInUsd) {
						for (const token in dayTokens.tokens) {
							if (stablecoinSymbols.has(token) && !stablecoinTokensUniqueSet.has(token)) {
								stablecoinTokensUniqueSet.add(token)
								const pegType = pegTypeMap.get(token)
								const pegMechanism = pegMechanismMap.get(token)
								if (pegType) pegTypesUnique.add(pegType)
								if (pegMechanism) pegMechanismsUnique.add(pegMechanism)
							}
						}
					}
				}
			}
		}
	}

	if (stablecoinTokensUniqueSet.size === 0) {
		return null
	}

	const stablecoinsByPegMechanism: Record<string, any> = {}
	const stablecoinsByPegType: Record<string, any> = {}
	const stablecoinsByToken: Record<string, any> = {}
	const totalStablecoins: Record<string, any> = {}

	for (const section in chainTvls) {
		const name = section.toLowerCase()
		if (!name.includes('-')) {
			const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
			if (isEnabled) {
				const tokensInUsd = chainTvls[section].tokensInUsd
				if (tokensInUsd) {
					for (const { date, tokens } of tokensInUsd) {
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
							stablecoinsByPegType[date][pegType] =
								(stablecoinsByPegType[date][pegType] || 0) + groupedByPegType[pegType]
						}

						if (!stablecoinsByToken[date]) {
							stablecoinsByToken[date] = { date }
						}
						for (const token in stablecoinsOnly) {
							stablecoinsByToken[date][token] = (stablecoinsByToken[date][token] || 0) + stablecoinsOnly[token]
						}

						let total = 0
						for (const token in stablecoinsOnly) {
							total += stablecoinsOnly[token]
						}
						totalStablecoins[date] = (totalStablecoins[date] || 0) + total
					}
				}
			}
		}
	}

	const stablecoinsByPegMechanismArray = []
	for (const date in stablecoinsByPegMechanism) {
		stablecoinsByPegMechanismArray.push(stablecoinsByPegMechanism[date])
	}
	stablecoinsByPegMechanismArray.sort((a, b) => a.date - b.date)

	const stablecoinsByPegTypeArray = []
	for (const date in stablecoinsByPegType) {
		stablecoinsByPegTypeArray.push(stablecoinsByPegType[date])
	}
	stablecoinsByPegTypeArray.sort((a, b) => a.date - b.date)

	const stablecoinsByTokenArray = []
	for (const date in stablecoinsByToken) {
		stablecoinsByTokenArray.push(stablecoinsByToken[date])
	}
	stablecoinsByTokenArray.sort((a, b) => a.date - b.date)

	const totalStablecoinsArray = []
	for (const date in totalStablecoins) {
		totalStablecoinsArray.push({ date: Number(date), value: totalStablecoins[date] })
	}
	totalStablecoinsArray.sort((a, b) => a.date - b.date)

	const latestByPegMechanism = stablecoinsByPegMechanismArray[stablecoinsByPegMechanismArray.length - 1]
	const pegMechanismPieChart = []
	if (latestByPegMechanism) {
		for (const name in latestByPegMechanism) {
			if (name !== 'date') {
				pegMechanismPieChart.push({ name, value: latestByPegMechanism[name] })
			}
		}
	}

	const pieChartDataByPegMechanism = preparePieChartData({ data: pegMechanismPieChart, limit: 10 })

	const latestByPegType = stablecoinsByPegTypeArray[stablecoinsByPegTypeArray.length - 1]
	const pegTypePieChart = []
	if (latestByPegType) {
		for (const name in latestByPegType) {
			if (name !== 'date') {
				pegTypePieChart.push({ name, value: latestByPegType[name] })
			}
		}
	}

	const pieChartDataByPegType = preparePieChartData({ data: pegTypePieChart, limit: 10 })

	return {
		stablecoinsByPegMechanism: stablecoinsByPegMechanismArray.length > 0 ? stablecoinsByPegMechanismArray : null,
		stablecoinsByPegType: stablecoinsByPegTypeArray.length > 0 ? stablecoinsByPegTypeArray : null,
		stablecoinsByToken: stablecoinsByTokenArray.length > 0 ? stablecoinsByTokenArray : null,
		totalStablecoins: totalStablecoinsArray.length > 0 ? totalStablecoinsArray : null,
		pegMechanismPieChart: pieChartDataByPegMechanism,
		pegTypePieChart: pieChartDataByPegType,
		stablecoinTokensUnique: Array.from(stablecoinTokensUniqueSet),
		pegTypesUnique: Array.from(pegTypesUnique),
		pegMechanismsUnique: Array.from(pegMechanismsUnique)
	}
}
