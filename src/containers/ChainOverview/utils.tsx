import { removedCategories } from '~/constants'
import type { IChainAsset, IFormattedChainAsset, ILiteProtocol } from './types'
import { IProtocolMetadata } from '../ProtocolOverview/types'

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

	if (toggledSettings['liquidstaking'] || toggledSettings['doublecounted']) return true

	return false
}

const getStartOfTimeFrame = (date: Date, frame: string) => {
	if (frame === 'daily') {
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
	} else if (frame === 'weekly') {
		const weekDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
		const lastDayOfWeek = date.getUTCDate() - weekDay
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), lastDayOfWeek)
	} else if (frame === 'monthly') {
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
	}
}

export function groupByTimeFrame(data, timeFrame) {
	if (timeFrame === 'daily') return data
	const groupedData = data.reduce((acc, [timestamp, ...values]) => {
		const date = new Date(parseInt(timestamp) * 1000)
		const timeFrameStart = Math.trunc(getStartOfTimeFrame(date, timeFrame) / 1000)

		if (!acc[timeFrameStart]) {
			acc[timeFrameStart] = values.map(() => 0)
		}

		values.forEach((value, index) => {
			acc[timeFrameStart][index] += Number(value)
		})

		return acc
	}, {} as Record<number, number[]>)

	return Object.entries(groupedData)
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
