import type { UnifiedTableConfig } from '~/containers/ProDashboard/types'
import { toChainSlug } from '~/containers/ProDashboard/chainNormalizer'

export interface LensTotals {
	tvl_base: number | null
	volume_dexs_1d: number | null
	volume_dexs_7d: number | null
	volume_aggregators_1d: number | null
	volume_aggregators_7d: number | null
	volume_derivatives_1d: number | null
	volume_options_1d: number | null
}

const MAX_CHAIN_FILTERS = 100
const MAX_CHAIN_NAME_LENGTH = 200
const ALLOWED_CHAIN_PATTERN = /^[a-z0-9- ]+$/i

export const toPercent = (value: number | null | undefined): number | null => {
	if (value === null || value === undefined) return null
	return value * 100
}

export const derivePreviousValue = (current: number | null | undefined, change: number | null | undefined) => {
	if (current === null || current === undefined) return null
	if (change === null || change === undefined) return null
	const denominator = 1 + change
	if (!Number.isFinite(denominator) || denominator === 0) return null
	return current / denominator
}

export const computeShare = (part: number | null | undefined, total: number | null | undefined): number | null => {
	if (part === null || part === undefined) return null
	if (total === null || total === undefined || total <= 0) return null
	return (part / total) * 100
}

export const normalizeChainList = (chains?: string[] | null): string[] => {
	if (!chains || !chains.length) return []

	if (!Array.isArray(chains)) {
		throw new Error('chains parameter must be an array')
	}

	if (chains.length > MAX_CHAIN_FILTERS) {
		throw new Error(`Too many chain filters provided. Maximum allowed is ${MAX_CHAIN_FILTERS}, received ${chains.length}`)
	}

	const normalized = chains
		.map((chain, index) => {
			if (typeof chain !== 'string') {
				throw new Error(`Chain at index ${index} must be a string, received ${typeof chain}`)
			}

			const trimmed = chain.trim()

			if (trimmed === '') {
				return null
			}

			if (trimmed.toLowerCase() === 'all') {
				return null
			}

			if (trimmed.length > MAX_CHAIN_NAME_LENGTH) {
				throw new Error(
					`Chain name at index ${index} is too long. Maximum length is ${MAX_CHAIN_NAME_LENGTH} characters, received ${trimmed.length}`
				)
			}

			if (!ALLOWED_CHAIN_PATTERN.test(trimmed)) {
				throw new Error(
					`Chain name at index ${index} contains invalid characters. Only alphanumeric characters, hyphens and spaces are allowed.`
				)
			}

			return toChainSlug(trimmed)
		})
		.filter((chain): chain is string => chain !== null)

	return Array.from(new Set(normalized))
}

export const resolveLogoUrl = (slug: string | null | undefined) => {
	if (!slug) return null
	return `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`
}

export const resolveChainLogo = (slug: string | null | undefined) => {
	if (!slug) return null
	return `https://icons.llamao.fi/icons/chains/rsz_${slug}?w=48&h=48`
}

export const extractChainFilters = (config: UnifiedTableConfig): string[] => {
	try {
		const chains = Array.isArray(config.params?.chains) ? config.params?.chains : []
		return normalizeChainList(chains)
	} catch (error) {
		if (error instanceof Error) {
			throw error
		}
		throw new Error('Failed to extract chain filters from config')
	}
}

export const formatDisplayName = (value?: string | null) => {
	if (!value) return ''

	const sanitized = String(value).slice(0, MAX_CHAIN_NAME_LENGTH)

	return sanitized
		.split(/[\s-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

