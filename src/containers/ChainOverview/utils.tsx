import { removedCategories } from '~/constants'
import type { IChainAsset, IChainAssets, IFormattedChainAsset, ILiteProtocol, IProtocolMetadata } from './types'

export const toFilterProtocol = ({
	protocolMetadata,
	protocolData,
	chainDisplayName
}: {
	protocolMetadata: IProtocolMetadata
	protocolData: ILiteProtocol
	chainDisplayName: string | null
}): boolean => {
	return protocolMetadata.name &&
		!protocolMetadata.name.startsWith('chain#') &&
		protocolMetadata.displayName &&
		protocolMetadata.chains &&
		(chainDisplayName !== 'All'
			? Array.from(new Set([...(protocolMetadata.chains ?? []), ...(protocolData.chains ?? [])])).includes(
					chainDisplayName
			  )
			: true) &&
		protocolData.category !== 'Bridge'
		? true
		: false
}

export const toStrikeTvl = (protocol, toggledSettings) => {
	if (removedCategories.includes(protocol.category)) return true

	if (protocol.category === 'Liquid Staking' && !toggledSettings['liquidstaking'] && !toggledSettings['doublecounted'])
		return true

	return false
}

const getStartOfTimeFrame = (date: Date, frame: string) => {
	if (frame === 'daily') {
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
	} else if (frame === 'weekly') {
		const day = date.getUTCDate() - date.getUTCDay() + (date.getUTCDay() === 0 ? -6 : 1)
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day)
	} else if (frame === 'monthly') {
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
	}
}

export function groupByTimeFrame(data, timeFrame) {
	const groupedData = data.reduce((acc, [timestamp, ...values]) => {
		const date = new Date(parseInt(timestamp) * 1000)
		const timeFrameStart = getStartOfTimeFrame(date, timeFrame)

		if (!acc[timeFrameStart]) {
			acc[timeFrameStart] = values.map(() => 0)
		}

		values.forEach((value, index) => {
			acc[timeFrameStart][index] += Number(value)
		})

		return acc
	}, {})

	return Object.entries(groupedData).map(([timeFrameStart, sums]: [string, number[]]) => {
		return [(+timeFrameStart / 1000).toFixed(0), ...sums]
	})
}

export function cumulativeSum(data) {
	let cumulativeData = []

	let runningTotal1 = 0
	let runningTotal2 = 0

	for (let i = 0; i < data.length; i++) {
		runningTotal1 += parseInt(data[i][1])
		runningTotal2 += parseInt(data[i][2])

		cumulativeData.push([data[i][0], runningTotal1, runningTotal2])
	}

	return cumulativeData
}

export function formatChainAssets(chainAsset: IChainAsset | null) {
	if (!chainAsset) return null

	return Object.entries(chainAsset).reduce((acc, [type, asset]) => {
		const formatted = {} as any
		formatted.total = Number(asset.total.split('.')[0])
		const breakdown = {}
		for (const b in asset.breakdown) {
			breakdown[b] = Number(asset.breakdown[b].split('.')[0])
		}
		formatted.breakdown = breakdown
		acc[type] = formatted
		return acc
	}, {} as IFormattedChainAsset)
}
