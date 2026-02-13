import type { IProtocolMetricsV2, IRaise } from '~/containers/ProtocolOverview/api.types'
import { postRuntimeLogs } from '~/utils/async'
import type { IProtocolWarningBanner } from './api.types'

const formatRaise = (raise: Omit<IRaise, 'defillamaId'>) => {
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

export const getProtocolWarningBanners = (protocolData: IProtocolMetricsV2) => {
	// Helper function to check if a date is in valid format
	const isValidDateFormat = (date: unknown): boolean => {
		if (!date || date === 'forever') return true

		// Check if it's a number (seconds or milliseconds)
		if (typeof date === 'number') {
			const dateObj = new Date(date * 1000)
			return !Number.isNaN(dateObj.getTime())
		}

		// Check if it's a Date-parseable string
		if (typeof date === 'string') {
			const dateObj = new Date(date)
			return !Number.isNaN(dateObj.getTime())
		}

		return false
	}

	const warningBanners = protocolData.warningBanners ?? []
	const banners: IProtocolWarningBanner[] = []
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
