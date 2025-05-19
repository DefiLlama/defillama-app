import { darken, transparentize } from 'polished'
import { tokenIconPaletteUrl } from '~/utils'
import { primaryColor } from '~/constants/colors'
import { fetchWithErrorLogging } from '~/utils/async'
import { HOURLY_PROTOCOL_API, PROTOCOL_API } from '~/constants'
import { IRaise } from '~/api/types'
import { IProtocolMetadata } from '../ChainOverview/types'

interface IUpdatedProtocol {
	id: string
	name: string
	address?: string | null
	symbol?: string | null
	url: string
	description: string
	chain: string
	logo: string
	audits: string | null
	audit_note: string | null
	gecko_id: string | null
	cmcId: string | null
	category: string
	chains: Array<string>
	module: string
	treasury?: string | null
	twitter: string
	audit_links: Array<string>
	openSource?: boolean
	forkedFrom: Array<string>
	oraclesByChain: Record<string, Array<string>>
	parentProtocol?: string
	governanceID?: Array<string>
	github?: Array<string>
	chainTvls?: Record<
		string,
		{
			tvl: Array<{ date: number; totalLiquidityUSD: number }>
			tokens: Array<{ date: number; tokens: Record<string, number> }>
			tokensInUsd: Array<{ date: number; tokens: Record<string, number> }>
		}
	>
	currentChainTvls?: Record<string, number>
	isParentProtocol?: boolean
	mcap: number | null
	methodology?: string
	raises: Array<IRaise>
	otherProtocols?: Array<string>
	hallmarks?: Array<[number, string]>
	stablecoins?: Array<string>
}

export const getProtocol = async (protocolName: string) => {
	const start = Date.now()
	try {
		const data: IUpdatedProtocol = await fetchWithErrorLogging(`${PROTOCOL_API}/${protocolName}`).then((res) =>
			res.json()
		)

		if (!data || (data as any).statusCode === 400) {
			throw new Error((data as any).body)
		}

		let isNewlyListedProtocol = true

		Object.values(data.chainTvls).forEach((chain) => {
			if (chain.tvl?.length > 7) {
				isNewlyListedProtocol = false
			}
		})

		// if (data?.listedAt && new Date(data.listedAt * 1000).getTime() < Date.now() - 1000 * 60 * 60 * 24 * 7) {
		// 	isNewlyListedProtocol = false
		// }

		if (isNewlyListedProtocol && !data.isParentProtocol) {
			const hourlyData = await fetchWithErrorLogging(`${HOURLY_PROTOCOL_API}/${protocolName}`).then((res) => res.json())

			return { ...hourlyData, isHourlyChart: true }
		} else return data
	} catch (e) {
		console.log(`[ERROR] [${Date.now() - start}ms] <${PROTOCOL_API}/${protocolName}>`, e)

		return null
	}
}

export const getProtocolPageStyles = async (protocol: string) => {
	const bgColor = await getColor(tokenIconPaletteUrl(protocol))

	const bgColor2 = bgColor.length < 7 ? '#1f67d2' : bgColor
	const backgroundColor = isDarkColor(bgColor2) ? '#1f67d2' : bgColor2

	return getStyles(backgroundColor)
}

function getStyles(color: string) {
	let color2 = color.length < 7 ? '#1f67d2' : color

	let finalColor = isDarkColor(color2) ? '#1f67d2' : color2

	return {
		'--primary-color': finalColor,
		'--bg-color': transparentize(0.6, finalColor),
		'--btn-bg': transparentize(0.9, finalColor),
		'--btn-hover-bg': transparentize(0.8, finalColor),
		'--btn-text': darken(0.1, finalColor)
	}
}

export const defaultPageStyles = {
	'--primary-color': '#1f67d2',
	'--bg-color': 'rgba(31,103,210,0.4)',
	'--btn-bg': 'rgba(31,103,210,0.1)',
	'--btn-hover-bg': 'rgba(31,103,210,0.2)',
	'--btn-text': '#1851a6'
} as React.CSSProperties

function isDarkColor(color: string) {
	// Convert hex to RGB
	const hex = color.replace('#', '')
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)

	// Calculate relative luminance
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)

	// Calculate saturation (0-1)
	const saturation = max === 0 ? 0 : (max - min) / max

	// Check if the color is grayish by comparing RGB components and saturation
	const tolerance = 15 // RGB difference tolerance
	const saturationThreshold = 0.15 // Colors with saturation below this are considered grayish

	const isGrayish =
		Math.abs(r - g) <= tolerance &&
		Math.abs(g - b) <= tolerance &&
		Math.abs(r - b) <= tolerance &&
		saturation <= saturationThreshold

	return isGrayish
}

const getColor = async (path: string) => {
	try {
		if (!path) return primaryColor

		const color = await fetchWithErrorLogging(path).then((res) => res.text())

		if (!color.startsWith('#')) {
			console.log(path, color)
			return primaryColor
		}

		return color
	} catch (error) {
		console.log(path, 'rugged, but handled')
		return primaryColor
	}
}

export const getProtocolMetrics = ({
	protocolData,
	metadata
}: {
	protocolData: IUpdatedProtocol
	metadata: IProtocolMetadata
}) => {
	return {
		tvl: metadata.tvl ? true : false,
		dexs: metadata.dexs ? true : false,
		perps: metadata.perps ? true : false,
		options: metadata.options ? true : false,
		dexAggregators: metadata.aggregator ? true : false,
		perpsAggregators: metadata.perpsAggregators ? true : false,
		bridgeAggregators: metadata.bridgeAggregators ? true : false,
		stablecoins: protocolData.stablecoins?.length > 0,
		bridge: protocolData.category === 'Bridge' || protocolData.category === 'Cross Chain',
		treasury: metadata.treasury ? true : false,
		unlocks: metadata.emissions ? true : false,
		yields: metadata.yields ? true : false,
		fees: metadata.fees ? true : false,
		forks: metadata.forks ? true : false,
		governance: protocolData.governanceID ? true : false
	}
}
