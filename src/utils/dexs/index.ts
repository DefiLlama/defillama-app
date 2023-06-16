import { IDexResponse } from '~/api/categories/dexs/types'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { capitalizeFirstLetter } from '..'

const summAllVolumes = (breakdownVolumes: IDexResponse['volumeHistory'][0]['dailyVolume']) =>
	Object.values(breakdownVolumes).reduce(
		(acc, volume) =>
			acc +
			Object.values(volume).reduce<number>((vacc, current) => (typeof current === 'number' ? vacc + current : vacc), 0),
		0
	)

export const getChartDataFromVolumeHistory = (volumeHistory: IDexResponse['volumeHistory']): [Date, number][] =>
	volumeHistory.map(({ timestamp, dailyVolume }) => [new Date(timestamp * 1000), summAllVolumes(dailyVolume)])

// TODO: do better
let ALL_CHAINS: string[] = []
export const formatVolumeHistoryToChartDataByChain = (
	volumeHistory: IDexResponse['volumeHistory']
): IStackedBarChartProps['chartData'] => {
	if (ALL_CHAINS.length === 0) ALL_CHAINS = getAllChains(volumeHistory)
	const chartData = volumeHistory.reduce((acc, { dailyVolume, timestamp }) => {
		//different timestamp
		const rawItems = ALL_CHAINS.reduce((acc, chain) => {
			const protVolumes = dailyVolume[chain] ?? {}
			//different chain
			const volumeAccrossProtocols = Object.entries(protVolumes).reduce((acc, [_, volume]) => {
				//different version
				if (typeof volume === 'number') return (acc += volume)
				// return sum accross protocols
				return acc
			}, 0)
			acc.push({
				name: chain,
				data: [new Date(timestamp * 1000), volumeAccrossProtocols]
			})
			// return total volume by chain
			return acc
		}, [] as Array<{ name: IStackedBarChartProps['chartData'][0]['name']; data: IStackedBarChartProps['chartData'][0]['data'][0] }>)
		for (const rawItem of rawItems) {
			if (acc[rawItem.name]) acc[rawItem.name].push(rawItem.data)
			else acc[rawItem.name] = [rawItem.data]
		}
		// return all data by chain
		return acc
	}, {})
	return Object.entries(chartData).map(([name, data]) => ({
		name: capitalizeFirstLetter(name),
		data
	})) as IStackedBarChartProps['chartData']
}

// TODO: do better
let ALL_VERSIONS: string[] = []
export const formatVolumeHistoryToChartDataByProtocol = (
	volumeHistory: IDexResponse['volumeHistory'],
	dexName: string,
	adapterName: string
): IStackedBarChartProps['chartData'] => {
	if (ALL_VERSIONS.length === 0) ALL_VERSIONS = getAllVProtocols(volumeHistory)
	const chartData = volumeHistory.reduce((acc, { dailyVolume, timestamp }) => {
		//different timestamp
		const rawItems = Object.entries(dailyVolume).reduce((acc, [_, protVolumes]) => {
			//different chain
			for (const version of Object.keys(protVolumes)) {
				const value = protVolumes[version]
				if (typeof value === 'number') {
					if (!ALL_VERSIONS.includes(version)) ALL_VERSIONS.push(version)
					acc[version] = (acc[version] ?? 0) + value
				}
			}
			// return total volume across chains by version
			return acc
		}, {} as { [version: string]: number })
		for (const key of ALL_VERSIONS) {
			//all versions should have value
			if (acc[key]) acc[key].push([new Date(timestamp * 1000), rawItems[key] ?? 0]) //default to 0 to avoid buggy chart
			else acc[key] = [[new Date(timestamp * 1000), rawItems[key] ?? 0]]
		}
		// return all data by chain
		return acc
	}, {} as { [protName: string]: IStackedBarChartProps['chartData'][0]['data'] })
	return Object.entries(chartData).map(([name, data]) => ({
		name: name === adapterName ? dexName : name,
		data
	})) as IStackedBarChartProps['chartData']
}

// TODO: Get list of vprotocols from api or improve
const getAllVProtocols = (volumeHistory: IDexResponse['volumeHistory']): string[] =>
	volumeHistory.reduce((acc, { dailyVolume }) => {
		for (const protData of Object.values(dailyVolume))
			for (const [protocolName, value] of Object.entries(protData))
				if (typeof value === 'number' && !acc.includes(protocolName)) acc.push(protocolName)
		return acc
	}, [] as string[])

// TODO: Get list of chains from api or improve
const getAllChains = (volumeHistory: IDexResponse['volumeHistory']): string[] =>
	volumeHistory.reduce((acc, { dailyVolume }) => {
		for (const [chains, protData] of Object.entries(dailyVolume))
			for (const [protocolName, value] of Object.entries(protData))
				if (typeof value === 'number' && !acc.includes(chains)) acc.push(chains)
		return acc
	}, [] as string[])
