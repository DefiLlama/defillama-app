import { useMemo } from 'react'
import { CHART_COLORS } from '~/constants/colors'
import type { IRWAAssetsOverview } from './queries'

type PieChartDatum = { name: string; value: number }

const buildStackColors = (order: string[]) => {
	const stackColors: Record<string, string> = {}
	for (const [idx, key] of order.entries()) {
		stackColors[key] = CHART_COLORS[idx % CHART_COLORS.length]
	}
	return stackColors
}

export function useRwaChainPieChartData({
	enabled,
	assets,
	categories,
	selectedCategories
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	categories: string[]
	selectedCategories: string[]
}) {
	return useMemo(() => {
		if (!enabled) {
			return {
				totalOnChainMcapPieChartData: [] as PieChartDatum[],
				activeMcapPieChartData: [] as PieChartDatum[],
				defiActiveTvlPieChartData: [] as PieChartDatum[],
				pieChartStackColors: {}
			}
		}
		const pieChartStackColors = buildStackColors(categories)
		const selectedCategoriesSet = new Set(selectedCategories)
		const categoryTotals = new Map<string, { onChain: number; active: number; defi: number }>()

		for (const asset of assets) {
			for (const category of asset.category ?? []) {
				if (!category || !selectedCategoriesSet.has(category)) continue

				const prev = categoryTotals.get(category) ?? { onChain: 0, active: 0, defi: 0 }
				prev.onChain += asset.onChainMcap.total
				prev.active += asset.activeMcap.total
				prev.defi += asset.defiActiveTvl.total
				categoryTotals.set(category, prev)
			}
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			Array.from(categoryTotals.entries())
				.map(([name, totals]) => ({ name, value: totals[metric] }))
				.filter((x) => x.value > 0)
				.sort((a, b) => b.value - a.value)

		return {
			totalOnChainMcapPieChartData: toSortedChartData('onChain'),
			activeMcapPieChartData: toSortedChartData('active'),
			defiActiveTvlPieChartData: toSortedChartData('defi'),
			pieChartStackColors
		}
	}, [assets, categories, enabled, selectedCategories])
}

export function useRwaCategoryAssetClassPieChartData({
	enabled,
	assets,
	assetClasses,
	selectedAssetClasses
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	assetClasses: string[]
	selectedAssetClasses: string[]
}) {
	return useMemo(() => {
		if (!enabled) {
			return {
				assetClassOnChainMcapPieChartData: [] as PieChartDatum[],
				assetClassActiveMcapPieChartData: [] as PieChartDatum[],
				assetClassDefiActiveTvlPieChartData: [] as PieChartDatum[],
				assetClassPieChartStackColors: {}
			}
		}

		const assetClassPieChartStackColors = buildStackColors(assetClasses)
		const selectedAssetClassesSet = new Set(selectedAssetClasses)
		const assetClassTotals = new Map<string, { onChain: number; active: number; defi: number }>()

		for (const asset of assets) {
			for (const assetClass of asset.assetClass ?? []) {
				if (!assetClass || !selectedAssetClassesSet.has(assetClass)) continue

				const prev = assetClassTotals.get(assetClass) ?? { onChain: 0, active: 0, defi: 0 }
				prev.onChain += asset.onChainMcap.total
				prev.active += asset.activeMcap.total
				prev.defi += asset.defiActiveTvl.total
				assetClassTotals.set(assetClass, prev)
			}
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			Array.from(assetClassTotals.entries())
				.map(([name, totals]) => ({ name, value: totals[metric] }))
				.filter((x) => x.value > 0)
				.sort((a, b) => b.value - a.value)

		return {
			assetClassOnChainMcapPieChartData: toSortedChartData('onChain'),
			assetClassActiveMcapPieChartData: toSortedChartData('active'),
			assetClassDefiActiveTvlPieChartData: toSortedChartData('defi'),
			assetClassPieChartStackColors
		}
	}, [assetClasses, assets, enabled, selectedAssetClasses])
}

export function useRwaAssetNamePieChartData({
	enabled,
	assets,
	selectedAssetNames
}: {
	enabled: boolean
	assets: IRWAAssetsOverview['assets']
	selectedAssetNames: string[]
}) {
	return useMemo(() => {
		const MAX_LABELS = 24
		const UNKNOWN = 'Unknown'
		const OTHERS = 'Others'

		if (!enabled) {
			return {
				assetNameOnChainMcapPieChartData: [] as PieChartDatum[],
				assetNameActiveMcapPieChartData: [] as PieChartDatum[],
				assetNameDefiActiveTvlPieChartData: [] as PieChartDatum[],
				assetNamePieChartStackColors: {}
			}
		}

		const selectedAssetNamesSet = new Set(selectedAssetNames)
		if (selectedAssetNamesSet.size === 0) {
			return {
				assetNameOnChainMcapPieChartData: [] as PieChartDatum[],
				assetNameActiveMcapPieChartData: [] as PieChartDatum[],
				assetNameDefiActiveTvlPieChartData: [] as PieChartDatum[],
				assetNamePieChartStackColors: {}
			}
		}

		const selectedAssets = assets.filter((asset) => {
			const name = asset.name?.trim() || asset.ticker?.trim() || UNKNOWN
			return selectedAssetNamesSet.has(name)
		})

		const discoveredNames = new Set<string>()
		for (const asset of selectedAssets) {
			discoveredNames.add(asset.name?.trim() || asset.ticker?.trim() || UNKNOWN)
		}

		const colorOrder = Array.from(discoveredNames).sort()
		// Keep existing label colors stable while ensuring "Others" exists.
		if (!colorOrder.includes(OTHERS)) colorOrder.push(OTHERS)
		const assetNamePieChartStackColors = buildStackColors(colorOrder)

		const totals = new Map<string, { onChain: number; active: number; defi: number }>()
		for (const asset of selectedAssets) {
			const name = asset.name?.trim() || asset.ticker?.trim() || UNKNOWN
			const prev = totals.get(name) ?? { onChain: 0, active: 0, defi: 0 }
			prev.onChain += asset.onChainMcap.total
			prev.active += asset.activeMcap.total
			prev.defi += asset.defiActiveTvl.total
			totals.set(name, prev)
		}

		const limitChartData = (data: PieChartDatum[]) => {
			if (data.length <= MAX_LABELS) return data
			const head = data.slice(0, MAX_LABELS - 1)
			const othersValue = data.slice(MAX_LABELS - 1).reduce((sum, d) => sum + d.value, 0)
			return othersValue > 0 ? [...head, { name: OTHERS, value: othersValue }] : head
		}

		const toSortedChartData = (metric: 'onChain' | 'active' | 'defi') =>
			limitChartData(
				Array.from(totals.entries())
					.map(([name, v]) => ({ name, value: v[metric] }))
					.filter((x) => x.value > 0)
					.sort((a, b) => b.value - a.value)
			)

		return {
			assetNameOnChainMcapPieChartData: toSortedChartData('onChain'),
			assetNameActiveMcapPieChartData: toSortedChartData('active'),
			assetNameDefiActiveTvlPieChartData: toSortedChartData('defi'),
			assetNamePieChartStackColors
		}
	}, [assets, enabled, selectedAssetNames])
}
