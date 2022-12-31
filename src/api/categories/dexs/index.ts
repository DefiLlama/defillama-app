import type { LiteProtocol } from '~/api/types'
import { DEXS_API, DEX_BASE_API, PROTOCOLS_API } from '~/constants'
import { chainIconUrl, getColorFromNumber, getDominancePercent } from '~/utils'
import { IDexResponse, IGetDexsResponseBody, VolumeSummaryDex } from './types'
import { formatChain } from './utils'

export const getDex = async (dexName: string): Promise<IDexResponse> =>
	await fetch(`${DEX_BASE_API}/${dexName}`).then((r) => r.json())

export const getDexs = (): Promise<IGetDexsResponseBody> =>
	fetch(`${DEXS_API}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`).then((r) => r.json())

// - used in /[dex]
export async function getDexPageData(dex: string) {
	const dexResponse = await fetch(`${DEX_BASE_API}/${dex}`).then((r) => r.json())

	return {
		props: dexResponse
	}
}

// - used in /dexs and /dexs/[chain]
export const getChainPageData = async (chain?: string) => {
	let API = `${DEXS_API}`
	if (chain !== undefined) API = `${API}/${chain}`
	API = `${API}?excludeTotalDataChartBreakdown=true`
	const {
		dexs,
		totalVolume,
		changeVolume1d,
		changeVolume7d,
		changeVolume30d,
		totalDataChart,
		totalDataChartBreakdown,
		allChains
	} = (await fetch(API).then((res) => res.json())) as IGetDexsResponseBody
	const getProtocolsRaw = (): Promise<{ protocols: LiteProtocol[] }> => fetch(PROTOCOLS_API).then((r) => r.json())
	const protocolsData = await getProtocolsRaw()
	const tvlData = protocolsData.protocols.reduce((acc, pd) => {
		acc[pd.name] = pd.tvlPrevDay
		return acc
	}, {})

	const dexsWithSubrows = dexs.map((dex) => ({
		...dex,
		volumetvl: dex.totalVolume24h / tvlData[dex.name],
		dominance: (100 * dex.totalVolume24h) / totalVolume,
		chains: dex.chains.map(formatChain),
		subRows: dex.protocolVersions
			? Object.entries(dex.protocolVersions)
					.map(([versionName, summary]) => ({
						...dex,
						name: `${dex.name} - ${versionName.toUpperCase()}`,
						displayName: `${dex.name} - ${versionName.toUpperCase()}`,
						...summary
					}))
					.sort((first, second) => 0 - (first.totalVolume24h > second.totalVolume24h ? 1 : -1))
			: null
	}))

	return {
		props: {
			dexs: dexsWithSubrows,
			totalVolume,
			changeVolume1d,
			changeVolume30d,
			changeVolume7d,
			totalDataChart: totalDataChart,
			chain: chain ? formatChain(chain) : 'All',
			tvlData,
			totalDataChartBreakdown,
			allChains
		}
	}
}

// - used in /dexs/chains
export const getVolumesByChain = async () => {
	const { allChains } = (await fetch(`${DEXS_API}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`).then(
		(res) => res.json()
	)) as IGetDexsResponseBody

	const volumesByChain = await Promise.all(allChains.map((chain) => getChainPageData(chain)))

	let tableData = volumesByChain.map(
		({ props: { totalVolume, changeVolume1d, changeVolume30d, chain, changeVolume7d } }) => ({
			name: chain,
			logo: chainIconUrl(chain),
			totalVolume,
			changeVolume1d,
			changeVolume30d,
			changeVolume7d,
			dominance: 0
		})
	)

	const chartData = {}

	volumesByChain.forEach(({ props: { totalDataChart, chain } }) => {
		totalDataChart.forEach(([dateString, volume]) => {
			const date = Number(dateString)

			if (chartData[date]) {
				chartData[date] = { ...chartData[date], [chain]: volume }
			} else {
				let closestTimestamp = 0

				// +- 6hours
				for (let i = date - 21600; i <= date + 21600; i++) {
					if (chartData[i]) {
						closestTimestamp = i
					}
				}

				if (!closestTimestamp) {
					chartData[date] = {}
					closestTimestamp = date
				}

				chartData[closestTimestamp] = {
					...chartData[closestTimestamp],
					[chain]: volume
				}
			}
		})
	})

	const dateKeys = Object.keys(chartData).sort((a, b) => Number(a) - Number(b))

	const volumes = chartData[dateKeys[dateKeys.length - 1]]

	// get total 24hrs volumes
	const totalVolume24hrs = Object.values(volumes).reduce((acc: number, curr: number) => (acc += curr), 0) as number

	const chainColors = {
		Others: '#AAAAAA'
	}

	const chartStacks = {
		Others: 'a'
	}

	tableData = tableData.map((row) => ({
		...row,
		dominance: getDominancePercent(row.totalVolume, totalVolume24hrs)
	}))
	allChains.forEach((chain, index) => {
		// set unique color on each chain
		chainColors[chain] = getColorFromNumber(index, 9)
		chartStacks[chain] = 'a'
	})

	const formattedChartData = dateKeys.map((date) => {
		const volumesAtDate = Object.entries(chartData[date])

		if (volumesAtDate.length > 10) {
			return {
				date,
				...Object.fromEntries(volumesAtDate.slice(0, 11)),
				Others: volumesAtDate.slice(11).reduce((acc, curr: [string, number]) => (acc += curr[1]), 0)
			}
		}

		return { date, ...chartData[date] }
	})

	return {
		props: {
			tableData: tableData,
			chartData: formattedChartData,
			chartStacks,
			chainColors
		}
	}
}
