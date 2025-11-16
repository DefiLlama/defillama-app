import type { UnifiedTableConfig } from '~/containers/ProDashboard/types'

export interface LensTotals {
	tvl_base: number | null
	volume_dexs_1d: number | null
	volume_dexs_7d: number | null
	volume_aggregators_1d: number | null
	volume_aggregators_7d: number | null
	volume_derivatives_1d: number | null
	volume_options_1d: number | null
}

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
	const normalized = chains
		.map((chain) => (typeof chain === 'string' ? chain.trim().toLowerCase() : ''))
		.filter((chain) => chain && chain !== 'all')
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
	const chains = Array.isArray(config.params?.chains) ? config.params?.chains : []
	return normalizeChainList(chains)
}

export const formatDisplayName = (value?: string | null) => {
	if (!value) return ''
	return value
		.split(/[\s-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}
