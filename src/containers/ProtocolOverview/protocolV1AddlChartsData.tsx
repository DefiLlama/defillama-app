import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { fetchProtocolBySlug } from './api'
import type { IProtocolChainTvlEntry, IProtocolOverviewMetricsV1 } from './api.types'

type ChainTvlEntry = IProtocolChainTvlEntry
type ChainTvls = Record<string, ChainTvlEntry>
type DateValueRow = { date: number } & Record<string, number>

export const formatProtocolV1TvlsByChain = ({
	historicalChainTvls,
	extraTvlsEnabled
}: {
	historicalChainTvls: ChainTvls
	extraTvlsEnabled: Record<string, boolean>
}): DateValueRow[] => {
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

	const result: DateValueRow[] = []
	for (const date in tvlDictionary) {
		result.push({ ...tvlDictionary[date], date: Number(date) })
	}
	result.sort((a, b) => a.date - b.date)
	return result
}

function buildProtocolV1Inflows({
	chainTvls,
	extraTvlsEnabled,
	tokensUnique,
	datesToDelete,
	tokenToExclude
}: {
	chainTvls: ChainTvls
	extraTvlsEnabled: Record<string, boolean>
	tokensUnique: string[]
	datesToDelete: number[]
	tokenToExclude?: string | null
}) {
	const usdInflows: Record<string, number> = {}
	const tokenInflows: Record<string, DateValueRow> = {}
	const tokensUniqueSet = new Set(tokensUnique)

	let zeroUsdInfows = 0
	let zeroTokenInfows = 0

	for (const section in chainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (name.includes('-')) continue

		const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
		if (!isEnabled) continue

		// Index per-date maps
		const tokensInUsdByDate: Record<string, Record<string, number>> = {}
		const tokensByDate: Record<string, Record<string, number>> = {}
		const dateSet = new Set<string>()

		for (const { date, tokens } of chainTvls[section]?.tokensInUsd ?? []) {
			tokensInUsdByDate[date] = tokens
			dateSet.add(String(date))
		}
		for (const { date, tokens } of chainTvls[section]?.tokens ?? []) {
			tokensByDate[date] = tokens
			dateSet.add(String(date))
		}

		const dates: string[] = Array.from(dateSet).sort((a, b) => Number(a) - Number(b))

		for (let i = 1; i < dates.length; i++) {
			const currentDate = dates[i]
			const prevDate = dates[i - 1]

			const currentTokens = tokensByDate[currentDate] || {}
			const oldTokens = tokensByDate[prevDate] || {}
			const currentUsdTokens = tokensInUsdByDate[currentDate] || {}
			const oldUsdTokens = tokensInUsdByDate[prevDate] || {}

			// Build price map using larger totalUSD preference
			const priceMap: Record<string, { value: number; totalUSD: number }> = {}
			for (const token in currentUsdTokens) {
				const amount = currentTokens[token]
				const usd = currentUsdTokens[token]
				if (amount && amount > 0) {
					priceMap[token] = { value: usd / amount, totalUSD: usd }
				}
			}
			for (const token in oldUsdTokens) {
				const amount = oldTokens[token]
				const usd = oldUsdTokens[token]
				if (amount && amount > 0) {
					if (!priceMap[token] || priceMap[token].totalUSD < usd) {
						priceMap[token] = { value: usd / amount, totalUSD: usd }
					}
				}
			}

			let dayDifference = 0
			let tokenDayDifference: Record<string, number> = {}

			// Iterate all tokens that changed
			const allTokens = new Set<string>()
			for (const token in currentTokens) {
				allTokens.add(token)
			}
			for (const token in oldTokens) {
				allTokens.add(token)
			}

			for (const token of allTokens) {
				// Skip excluded token
				if (tokenToExclude && token === tokenToExclude) continue

				const currentAmount = currentTokens[token] || 0
				const prevAmount = oldTokens[token] || 0
				const diff = currentAmount - prevAmount
				if (diff === 0) continue

				let priceInfo = priceMap[token]
				if (!priceInfo) {
					// Fallback price from whichever side has info
					if (currentAmount > 0 && currentUsdTokens[token] != null) {
						priceInfo = { value: currentUsdTokens[token] / currentAmount, totalUSD: currentUsdTokens[token] }
					} else if (prevAmount > 0 && oldUsdTokens[token] != null) {
						priceInfo = { value: oldUsdTokens[token] / prevAmount, totalUSD: oldUsdTokens[token] }
					}
				}

				if (!priceInfo || !isFinite(priceInfo.value)) continue

				const diffUsd = diff * priceInfo.value
				// Ignore outliers similar to computeInflowsData
				if (Math.abs(diffUsd) > 2 * (priceInfo.totalUSD || 0)) continue

				dayDifference += diffUsd

				// Track token inflows only for tokens in tokensUnique
				if (tokensUniqueSet.has(token)) {
					tokenDayDifference[token] = (tokenDayDifference[token] || 0) + diffUsd
				}
			}

			if (dayDifference === 0) {
				zeroUsdInfows++
			}

			let hasTokenDifference = false
			for (const _ in tokenDayDifference) {
				hasTokenDifference = true
				break
			}
			if (!hasTokenDifference) {
				zeroTokenInfows++
			}

			usdInflows[currentDate] = (usdInflows[currentDate] || 0) + dayDifference

			if (!tokenInflows[currentDate]) {
				tokenInflows[currentDate] = { date: Number(currentDate) }
			}
			// Merge existing values accumulated from other chains before writing
			for (const token in tokenInflows[currentDate]) {
				if (token !== 'date') {
					tokenDayDifference[token] = (tokenDayDifference[token] || 0) + tokenInflows[currentDate][token]
				}
			}
			for (const token in tokenDayDifference) {
				tokenInflows[currentDate][token] = tokenDayDifference[token]
			}
		}
	}

	for (const date of datesToDelete) {
		delete usdInflows[String(date)]
		delete tokenInflows[String(date)]
	}

	const usdFlows: Array<[string, number]> = []
	for (const date in usdInflows) {
		usdFlows.push([date, usdInflows[date]])
	}
	usdFlows.sort((a, b) => Number(a[0]) - Number(b[0]))

	const tokenFlows: DateValueRow[] = []
	for (const date in tokenInflows) {
		tokenFlows.push(tokenInflows[date])
	}
	tokenFlows.sort((a, b) => a.date - b.date)

	return {
		usdInflows: (zeroUsdInfows === usdFlows.length ? null : usdFlows) as Array<[string, number]> | null,
		tokenInflows: zeroTokenInfows === tokenFlows.length ? null : tokenFlows
	}
}

// Helper: get top 10 non-UNKNOWN, non-near-zero tokens by absolute value.
// Returns [topTokens, totalTokenCount]
function getTop10Tokens(tokens: Record<string, number>): [Array<[string, number]>, number] {
	const validTokens: Array<[string, number]> = []
	let totalCount = 0

	for (const token in tokens) {
		totalCount++
		if (token.startsWith('UNKNOWN') || tokens[token] < 1) continue
		validTokens.push([token, tokens[token]])
	}

	if (validTokens.length <= 10) {
		validTokens.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
		return [validTokens, totalCount]
	}

	// Partial sort: only sort top 10, more efficient than full sort
	validTokens.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
	return [validTokens.slice(0, 10), totalCount]
}

// Helper: accumulate per-token USD flows between consecutive dates into `tokenFlows`.
function accumulateTokenFlows({
	tokensInUsd,
	tokens,
	tokenFlows
}: {
	tokensInUsd: Array<{ date: number; tokens: Record<string, number> }>
	tokens: Array<{ date: number; tokens: Record<string, number> }>
	tokenFlows: Map<string, number>
}) {
	if (tokensInUsd.length === 0 || tokens.length === 0) return

	const tokensInUsdMap: Record<string, Record<string, number>> = {}
	const tokensMap: Record<string, Record<string, number>> = {}

	for (const { date, tokens: tokenData } of tokensInUsd) {
		tokensInUsdMap[date] = tokenData
	}

	for (const { date, tokens: tokenData } of tokens) {
		tokensMap[date] = tokenData
	}

	// Process dates in order (assuming arrays are already sorted by date)
	const dates: string[] = tokensInUsd.map(({ date }) => String(date))
	if (dates.length <= 1) return

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

// build unique tokens based on top 10 tokens in usd value on each day
// also includes tokens with significant flows (outflows/inflows > $100M)
function getUniqueTokens({
	chainTvls,
	extraTvlsEnabled
}: {
	chainTvls: ChainTvls
	extraTvlsEnabled: Record<string, boolean>
}) {
	const tokenSet: Set<string> = new Set()
	const tokenFlows: Map<string, number> = new Map()
	const SIGNIFICANT_FLOW_THRESHOLD = 100_000_000 // $100M

	for (const section in chainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (name.includes('-')) continue

		// Check if section is enabled
		const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
		if (!isEnabled) continue

		const sectionTokensInUsd = chainTvls[section].tokensInUsd ?? []
		const sectionTokens = chainTvls[section].tokens ?? []
		let othersCategoryExist = false

		// First pass: collect tokens based on top 10 USD values per day
		if (sectionTokensInUsd.length > 0) {
			for (const dayTokens of sectionTokensInUsd) {
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
		if (sectionTokensInUsd.length > 0 && sectionTokens.length > 0) {
			accumulateTokenFlows({
				tokensInUsd: sectionTokensInUsd,
				tokens: sectionTokens,
				tokenFlows
			})
		}

		// Fallback: if tokensInUsd is empty, build unique tokens from raw tokens
		if (tokenSet.size === 0 && sectionTokens.length > 0) {
			for (const dayTokens of sectionTokens) {
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

// Helper to aggregate token balances for a given day into the provided directory.
// When `dateToTokensInUsd` is provided, `tokens` are interpreted as raw quantities
// and we can optionally filter out tokens whose raw size is huge but USD value is tiny.
function storeTokensBreakdown({
	date,
	tokens,
	tokensUniqueSet,
	directory,
	hideBigTokens = false,
	dateToTokensInUsd = null
}: {
	date: number
	tokens: Record<string, number>
	tokensUniqueSet: Set<string>
	directory: Record<string | number, Record<string, number>>
	hideBigTokens?: boolean
	dateToTokensInUsd?: Map<number, Record<string, number>> | null
}) {
	const tokensOfTheDay: Record<string, number> = {}
	// filters tokens that have no name or their value is near zero
	for (const token in tokens) {
		if (token.startsWith('UNKNOWN') || tokens[token] < 1) continue

		// If we have both raw quantities and USD values (i.e. building the raw-quantity chart),
		// drop tokens where the raw balance is enormous but the USD value is very small or missing.
		// This avoids tokens with silly scales (e.g. 1T units but < $1M) from blowing up the raw chart.
		if (dateToTokensInUsd) {
			const usdForDate = dateToTokensInUsd.get(date)

			// If we have raw data but no USD snapshot for this date, skip this token
			// from the raw-quantity chart to avoid nonsense spikes.
			if (!usdForDate) continue

			const usdValue = usdForDate[token]

			// If this token has no USD value at this date, also skip it.
			if (usdValue === undefined) continue

			// If the raw balance is enormous but the USD value is tiny, drop it.
			if (tokens[token] > 100_000_000 && usdValue < 1_000_000) continue
		}

		tokensOfTheDay[token] = tokens[token]
	}

	const tokensToShow: Record<string, number> = {}
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
	if (!hideBigTokens && tokensUniqueSet.has('Others') && remainingTokensSum > 0) {
		tokensToShow['Others'] = remainingTokensSum
	}

	const dir: Record<string, number> = { date, ...(directory[date] ?? {}) }

	for (const token in tokensToShow) {
		dir[token] = (dir[token] ?? 0) + tokensToShow[token]
	}

	directory[date] = dir
}

function buildProtocolV1TokensBreakdown({
	chainTvls,
	extraTvlsEnabled,
	tokensUnique
}: {
	chainTvls: ChainTvls
	extraTvlsEnabled: Record<string, boolean>
	tokensUnique: string[]
}) {
	const tokensInUsd: Record<string, Record<string, number>> = {}
	const rawTokens: Record<string, Record<string, number>> = {}
	const tokensUniqueSet = new Set<string>(tokensUnique)

	for (const chain in chainTvls) {
		const name = chain.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-')) {
			// sum key with staking, ethereum, arbitrum etc
			const isEnabled = name in extraTvlsEnabled ? extraTvlsEnabled[name] : true
			if (!isEnabled) continue

			// Build a per-chain map from date -> tokensInUsd so we can:
			// - aggregate the USD chart without any extra filtering
			// - when building the raw-quantity chart, filter out tokens with huge raw but tiny USD
			let dateToTokensInUsd: Map<number, Record<string, number>> | null = null

			const chainTokensInUsd = chainTvls[chain].tokensInUsd ?? []
			if (chainTokensInUsd.length > 0) {
				dateToTokensInUsd = new Map<number, Record<string, number>>()
				for (const { date, tokens } of chainTokensInUsd) {
					dateToTokensInUsd.set(date, tokens)
					// For the USD chart, values in `tokens` are already in USD, so we don't pass the map.
					storeTokensBreakdown({
						date,
						tokens,
						tokensUniqueSet,
						directory: tokensInUsd
					})
				}
			}

			// For the raw-quantity chart, we pass `dateToTokensInUsd` (when available) so that
			// `storeTokensBreakdown` can drop tokens where raw is huge but USD is very small.
			for (const { date, tokens } of chainTvls[chain].tokens ?? []) {
				storeTokensBreakdown({
					date,
					tokens,
					tokensUniqueSet,
					directory: rawTokens,
					hideBigTokens: true,
					dateToTokensInUsd
				})
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

const buildProtocolV1AddlChartsData = ({
	protocolData,
	extraTvlsEnabled,
	isBorrowed,
	tokenToExclude
}: {
	protocolData: { name: string; chainTvls?: ChainTvls; misrepresentedTokens?: boolean } | null
	extraTvlsEnabled: Record<string, boolean>
	isBorrowed?: boolean
	tokenToExclude?: string | null
}) => {
	if (!protocolData) return {}

	let chainTvls = protocolData.chainTvls ?? {}
	if (isBorrowed) {
		chainTvls = {}
		const sourceTvls = protocolData.chainTvls ?? {}
		for (const chain in sourceTvls) {
			if (chain.endsWith('-borrowed')) {
				const chainName = chain.slice(0, chain.lastIndexOf('-'))
				chainTvls[chainName] = sourceTvls[chain]
			}
		}
	}

	let tokensInUsdExists = false
	let tokensExists = false

	for (const chain in chainTvls) {
		const chainData = chainTvls[chain]
		if (!tokensInUsdExists && chainData.tokensInUsd && chainData.tokensInUsd.length > 0) {
			tokensInUsdExists = true
		}

		if (!tokensExists && chainData.tokens && chainData.tokens.length > 0) {
			tokensExists = true
		}
	}

	if (!protocolData.misrepresentedTokens && (tokensInUsdExists || tokensExists)) {
		let tokensUnique = getUniqueTokens({ chainTvls, extraTvlsEnabled })

		// Filter out the excluded token if specified
		if (tokenToExclude) {
			tokensUnique = tokensUnique.filter((token) => token !== tokenToExclude)
		}

		const { tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown } = buildProtocolV1TokensBreakdown({
			chainTvls: chainTvls,
			extraTvlsEnabled,
			tokensUnique
		})

		const { usdInflows, tokenInflows } = buildProtocolV1Inflows({
			chainTvls: chainTvls,
			extraTvlsEnabled,
			tokensUnique,
			datesToDelete: protocolData.name === 'Binance CEX' ? [1681430400, 1681516800] : [],
			tokenToExclude
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

export const useFetchProtocolV1AddlChartsData = (
	protocolName: string,
	isBorrowed = false,
	tokenToExclude?: string | null
) => {
	const { data: addlProtocolData, isLoading } = useQuery<IProtocolOverviewMetricsV1>({
		queryKey: ['protocol-overview-v1', protocolName, 'metrics'],
		queryFn: () => fetchProtocolBySlug<IProtocolOverviewMetricsV1>(protocolName),
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: 0
	})
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	// Normalize to null for consistent caching
	const normalizedTokenToExclude = tokenToExclude || null

	const data = useQuery({
		queryKey: [
			'protocol-overview',
			'addl-chart-data',
			protocolName,
			Boolean(addlProtocolData),
			isBorrowed ? 'borrowed' : JSON.stringify(extraTvlsEnabled),
			normalizedTokenToExclude
		],
		queryFn: () =>
			buildProtocolV1AddlChartsData({
				protocolData: addlProtocolData ?? null,
				extraTvlsEnabled: isBorrowed ? {} : extraTvlsEnabled,
				isBorrowed,
				tokenToExclude: normalizedTokenToExclude
			}),
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const historicalChainTvls = useMemo(() => {
		if (isBorrowed) {
			const chainTvls: ChainTvls = {}
			const sourceTvls = addlProtocolData?.chainTvls ?? {}
			for (const chain in sourceTvls) {
				if (chain.endsWith('-borrowed')) {
					const chainName = chain.slice(0, chain.lastIndexOf('-'))
					chainTvls[chainName] = sourceTvls[chain]
				}
			}
			return chainTvls
		}
		return addlProtocolData?.chainTvls ?? null
	}, [addlProtocolData, isBorrowed])

	return { ...data, historicalChainTvls, isLoading: data.isLoading || isLoading }
}
