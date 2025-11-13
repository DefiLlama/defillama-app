import { useMemo } from 'react'
import { UNIFIED_TABLE_PRESETS_BY_ID } from '~/containers/ProDashboard/components/UnifiedTable/config/PresetRegistry'
import type { TableFilters, UnifiedTableConfig } from '~/containers/ProDashboard/types'

type StrategyType = UnifiedTableConfig['strategyType']

interface UsePresetRecommendationsProps {
	strategyType: StrategyType
	filters: TableFilters
	chains: string[]
	category: string | null
}

export function usePresetRecommendations({
	strategyType,
	filters,
	chains,
	category
}: UsePresetRecommendationsProps) {
	return useMemo(() => {
		const ids = new Set<string>()
		const addPreset = (presetId: string) => {
			const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(presetId)
			if (!preset || preset.strategyType !== strategyType) return
			ids.add(presetId)
		}

		const normalizeValue = (value: string) => value.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')

		const includeCategories = Array.isArray(filters.categories) ? (filters.categories as string[]) : []
		const excludeCategories = Array.isArray(filters.excludedCategories) ? (filters.excludedCategories as string[]) : []
		const combinedCategories = [...includeCategories, ...excludeCategories].map(normalizeValue)
		const normalizedCategorySet = new Set(combinedCategories)

		const protocolFilters = Array.isArray(filters.protocols) ? (filters.protocols as string[]) : []
		const normalizedProtocols = protocolFilters.map(normalizeValue)

		const normalizedChains = chains.map(normalizeValue)
		const selectedCategory = category ? normalizeValue(category) : null

		const hasOracles = Array.isArray(filters.oracles) && filters.oracles.length > 0
		const hasRewards = Boolean(filters.hasRewards)
		const hasActiveLending = Boolean(filters.activeLending)

		const CATEGORY_PRESET_MAP: Record<string, string[]> = {
			dexs: ['volume-protocols'],
			'dex aggregator': ['aggregators-protocols'],
			options: ['options-protocols'],
			'exotic options': ['options-protocols'],
			'options vault': ['options-protocols'],
			derivatives: ['perps-protocols'],
			perps: ['perps-protocols'],
			bridge: ['bridge-aggregators-protocols'],
			'bridge aggregator': ['bridge-aggregators-protocols'],
			'cross chain bridge': ['bridge-aggregators-protocols'],
			yield: ['revenue-protocols'],
			'yield aggregator': ['revenue-protocols'],
			'yield lottery': ['revenue-protocols'],
			'liquid staking': ['revenue-protocols'],
			'liquid restaking': ['revenue-protocols'],
			restaking: ['revenue-protocols'],
			lending: ['fees-protocols', 'revenue-protocols'],
			'uncollateralized lending': ['fees-protocols', 'revenue-protocols'],
			cdp: ['revenue-protocols'],
			'cdp manager': ['revenue-protocols'],
			'stablecoin issuer': ['revenue-protocols'],
			rwa: ['revenue-protocols'],
			'rwa lending': ['revenue-protocols'],
			synthetics: ['growth-protocols'],
			'leveraged farming': ['growth-protocols'],
			farm: ['growth-protocols'],
			insurance: ['revenue-protocols'],
			mev: ['growth-protocols'],
			oracle: ['perps-protocols']
		}

		const PROTOCOL_KEYWORD_PRESETS: Array<{ keywords: string[]; presets: string[] }> = [
			{
				keywords: ['uniswap', 'sushi', 'balancer', 'curve', 'pancake', 'raydium', 'spooky'],
				presets: ['volume-protocols']
			},
			{
				keywords: ['gmx', 'dydx', 'perp', 'perpetual', 'kwenta', 'hyperliquid', 'polynomial'],
				presets: ['perps-protocols']
			},
			{
				keywords: ['lyra', 'dopex', 'premia', 'aevo', 'ribbon', 'hemera', 'zeta'],
				presets: ['options-protocols']
			},
			{
				keywords: ['1inch', 'paraswap', 'matcha', 'rubic', 'lifi', 'zapper', 'metafi'],
				presets: ['aggregators-protocols']
			},
			{
				keywords: ['stargate', 'synapse', 'across', 'wormhole', 'hop', 'debridge'],
				presets: ['bridge-aggregators-protocols']
			},
			{
				keywords: ['maker', 'aave', 'compound', 'frax', 'liquity', 'spark', 'morpho'],
				presets: ['revenue-protocols', 'fees-protocols']
			}
		]

		const CHAIN_KEYWORD_PRESETS: Record<string, string[]> = {
			evm: ['chains-growth'],
			'layer 2': ['chains-growth', 'chains-fees'],
			rollup: ['chains-growth', 'chains-fees'],
			parachain: ['chains-growth'],
			cosmos: ['chains-fees']
		}

		if (strategyType === 'protocols') {
			addPreset('essential-protocols')
			addPreset('growth-protocols')
			addPreset('fees-protocols')
			addPreset('revenue-protocols')

			combinedCategories.forEach((categoryValue) => {
				Object.entries(CATEGORY_PRESET_MAP).forEach(([matchKey, presets]) => {
					if (categoryValue.includes(matchKey)) {
						presets.forEach(addPreset)
					}
				})
			})

			PROTOCOL_KEYWORD_PRESETS.forEach(({ keywords, presets }) => {
				if (keywords.some((keyword) => normalizedProtocols.some((protocol) => protocol.includes(keyword)))) {
					presets.forEach(addPreset)
				}
			})

			if (normalizedCategorySet.has('dex aggregator')) {
				addPreset('aggregators-protocols')
			}

			if (normalizedCategorySet.has('options') || normalizedCategorySet.has('exotic options')) {
				addPreset('options-protocols')
			}

			if (normalizedCategorySet.has('bridge aggregator')) {
				addPreset('bridge-aggregators-protocols')
			}

			if (normalizedCategorySet.has('oracle') || hasOracles) {
				addPreset('perps-protocols')
			}

			if (hasRewards || hasActiveLending) {
				addPreset('growth-protocols')
				addPreset('revenue-protocols')
			}

			if (normalizedChains.some((value) => value !== 'all')) {
				addPreset('volume-protocols')
				addPreset('revenue-protocols')
			}
		} else {
			addPreset('chains-essential')
			addPreset('chains-growth')
			addPreset('chains-fees')

			if (selectedCategory && selectedCategory !== 'all') {
				Object.entries(CHAIN_KEYWORD_PRESETS).forEach(([matchKey, presets]) => {
					if (selectedCategory.includes(matchKey)) {
						presets.forEach(addPreset)
					}
				})
			}

			if (chains.length > 0 && !chains.includes('All')) {
				addPreset('chains-growth')
			}
		}

		return Array.from(ids).filter((id) => {
			const preset = UNIFIED_TABLE_PRESETS_BY_ID.get(id)
			if (!preset) return false
			return preset.strategyType === strategyType
		})
	}, [
		strategyType,
		filters.categories,
		filters.excludedCategories,
		filters.protocols,
		filters.oracles,
		filters.hasRewards,
		filters.activeLending,
		chains,
		category
	])
}
