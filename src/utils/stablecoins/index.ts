import { getPrevPeggedTotalFromChart } from '~/utils'
import { useMemo } from 'react'

export const useBuildPeggedChartData = (
	chartDataByAssetOrChain,
	assetsOrChainsList,
	filteredIndexes?,
	issuanceType = 'mcap',
	chainTVLData?,
	selectedChain?,
	totalChartTooltipLabel = 'Mcap'
) => {
	const data = useMemo(
		() =>
			buildPeggedChartData(
				chartDataByAssetOrChain,
				assetsOrChainsList,
				filteredIndexes,
				issuanceType,
				chainTVLData,
				selectedChain,
				totalChartTooltipLabel
			),
		[
			chartDataByAssetOrChain,
			assetsOrChainsList,
			filteredIndexes,
			issuanceType,
			chainTVLData,
			selectedChain,
			totalChartTooltipLabel
		]
	)
	return data
}

export const buildPeggedChartData = (
	chartDataByAssetOrChain,
	assetsOrChainsList,
	filteredIndexes?,
	issuanceType = 'mcap',
	chainTVLData?,
	selectedChain?,
	totalChartTooltipLabel = 'Mcap'
) => {
	if (selectedChain === null) return {}
	const backfilledChains = [
		'All',
		'Ethereum',
		'BSC',
		'Avalanche',
		'Arbitrum',
		'Optimism',
		'Fantom',
		'Polygon',
		'Gnosis',
		'Celo',
		'Harmony',
		'Moonriver',
		'Aztec',
		'Loopring',
		'Starknet',
		'zkSync',
		'Boba',
		'Metis',
		'Moonbeam',
		'Syscoin',
		'OKExChain',
		'IoTeX',
		'Heco'
	]
	let unformattedAreaData = {}
	let unformattedTotalData = {}
	let stackedDatasetObject = {}
	let unformattedTokenInflowData = {}
	let assetAddedToInflows = assetsOrChainsList?.reduce((acc, curr) => ({ ...acc, [curr]: false }), {}) ?? {}

	chartDataByAssetOrChain?.forEach((charts, i) => {
		if (!charts.length || !filteredIndexes.includes(i)) return
		charts.forEach((chart, j) => {
			const mcap = getPrevPeggedTotalFromChart([chart], 0, issuanceType) // 'issuanceType' and 'mcap' here are 'circulating' values on /stablecoin pages, and 'mcap' otherwise
			const prevDayMcap = getPrevPeggedTotalFromChart([charts[j - 1]], 0, issuanceType)
			const assetOrChain = assetsOrChainsList[i]
			const date = chart.date
			if (date > 1596248105 && mcap) {
				if (backfilledChains.includes(selectedChain) || date > 1652241600) {
					// for individual chains data is currently only backfilled to May 11, 2022
					unformattedAreaData[date] = unformattedAreaData[date] || {}
					unformattedAreaData[date][assetsOrChainsList[i]] = mcap

					unformattedTotalData[date] = (unformattedTotalData[date] ?? 0) + mcap

					if (mcap !== null && mcap !== 0) {
						if (stackedDatasetObject[date] == undefined) {
							stackedDatasetObject[date] = {}
						}
						const b = stackedDatasetObject[date][assetOrChain]
						stackedDatasetObject[date][assetOrChain] = { ...b, circulating: mcap ?? 0 }
					}

					const diff = (mcap ?? 0) - (prevDayMcap ?? 0)
					// the first day's inflow is not added to prevent large inflows on the day token is first tracked
					if (assetAddedToInflows[assetOrChain]) {
						unformattedTokenInflowData[date] = unformattedTokenInflowData[date] || {}
						unformattedTokenInflowData[date][assetsOrChainsList[i]] = diff
					}
					if (diff) {
						assetAddedToInflows[assetOrChain] = true
					}
				}
			}
		})
	})

	const peggedAreaChartData = Object.entries(unformattedAreaData).map(([date, chart]) => {
		if (typeof chart === 'object') {
			return {
				date: date,
				...chart
			}
		}
	})

	const peggedAreaTotalData = chainTVLData
		? chainTVLData.tvl
				.map(([date, tvl]) => {
					if (date < 1609372800) return
					if (!backfilledChains.includes(selectedChain) && date < 1652241600) return
					const mcap = unformattedTotalData[date] ?? 0
					if (mcap === 0) return
					return {
						date: date,
						[totalChartTooltipLabel]: mcap,
						TVL: tvl
					}
				})
				.filter((entry) => entry)
		: Object.entries(unformattedTotalData).map(([date, mcap]) => {
				return {
					date: date,
					[totalChartTooltipLabel]: mcap
				}
		  })

	const stackedDataset = Object.entries(stackedDatasetObject)

	const secondsInDay = 3600 * 24
	let zeroTokenInflows = 0
	let zeroUsdInfows = 0
	let tokenInflows = []
	let usdInflows = []
	const tokenSet: Set<string> = new Set()
	Object.entries(unformattedTokenInflowData).map(([date, chart]) => {
		if (typeof chart === 'object') {
			let dayDifference = 0
			let tokenDayDifference = {}
			for (const token in chart) {
				tokenSet.add(token)
				const diff = chart[token]
				if (!Number.isNaN(diff)) {
					// Here, the inflow tokens could be restricted to top daily top tokens, but they aren't. Couldn't find good UX doing so.
					tokenDayDifference[token] = diff
					dayDifference += diff
				}
			}

			if (dayDifference === 0) {
				zeroUsdInfows++
			}

			if (Object.keys(tokenDayDifference)?.length === 0) {
				zeroTokenInflows++
			}

			// the dates on the inflows are all off by 1 (because timestamps are at 00:00), so they are moved back 1 day
			const adjustedDate = (parseInt(date) - secondsInDay).toString()

			tokenInflows.push({
				...tokenDayDifference,
				date: adjustedDate
			})

			usdInflows.push([adjustedDate, dayDifference])
		}
	})

	const tokenInflowNames = zeroTokenInflows === tokenInflows.length ? ['USDT'] : (Array.from(tokenSet) as any)

	tokenInflows = zeroTokenInflows === tokenInflows.length ? [{ USDT: 0, date: '1652486400' }] : tokenInflows
	usdInflows = zeroUsdInfows === usdInflows.length ? [['1652486400', 0]] : usdInflows

	return { peggedAreaChartData, peggedAreaTotalData, stackedDataset, tokenInflows, tokenInflowNames, usdInflows }
}
