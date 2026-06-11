import { useMemo } from 'react'
import { feesOptionsMap, tvlOptionsMap } from '~/components/Filters/options'
import { FEES_SETTINGS, isTvlSettingsKey, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { addOptionalFeeExtraTotal } from '~/metrics/feeExtras'
import type { IProtocolOverviewPageData } from './types'

type ToggleOption = { name: string; key: string }

const pushToggleOption = (toggleOptions: ToggleOption[], option: ToggleOption) => {
	if (!toggleOptions.some((item) => item.key === option.key)) {
		toggleOptions.push(option)
	}
}

const aggregateTvlByChain = ({
	source,
	destination,
	extraTvlsEnabled,
	toggleOptions
}: {
	source: Record<string, number>
	destination: Record<string, number>
	extraTvlsEnabled: Record<string, boolean>
	toggleOptions: ToggleOption[]
}) => {
	for (const chain in source) {
		if (isTvlSettingsKey(chain)) {
			const option = tvlOptionsMap.get(chain)
			if (option) {
				pushToggleOption(toggleOptions, option)
			}
			continue
		}

		const lastIndex = chain.lastIndexOf('-')
		const extraTvlKey = lastIndex === -1 ? undefined : chain.slice(lastIndex + 1)
		const normalizedExtraKey = extraTvlKey?.toLowerCase()
		const hasRecognizedExtraTvl = normalizedExtraKey != null && isTvlSettingsKey(normalizedExtraKey)

		// Preserve chain names that contain hyphens unless the suffix is a known extra-TVL key.
		if (!hasRecognizedExtraTvl) {
			destination[chain] = (destination[chain] ?? 0) + source[chain]
			continue
		}

		const chainName = chain.slice(0, lastIndex)
		const extraOption = tvlOptionsMap.get(normalizedExtraKey)
		if (extraOption) {
			pushToggleOption(toggleOptions, extraOption)
		}
		if (extraTvlsEnabled[normalizedExtraKey]) {
			destination[chainName] = (destination[chainName] ?? 0) + source[chain]
		}
	}
}

export const useFinalTVL = (props: IProtocolOverviewPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	return useMemo(() => {
		let tvl = 0
		const tvlByChainMap: Record<string, number> = {}
		const toggleOptions: ToggleOption[] = []
		let oracleTvs = 0
		const oracleTvsByChainMap: Record<string, number> = {}

		const currentTvlByChain = props.currentTvlByChain ?? {}
		aggregateTvlByChain({
			source: currentTvlByChain,
			destination: tvlByChainMap,
			extraTvlsEnabled,
			toggleOptions
		})

		for (const chain in tvlByChainMap) {
			tvl += tvlByChainMap[chain]
		}

		const oracleTvsData = props.oracleTvs ?? {}
		aggregateTvlByChain({
			source: oracleTvsData,
			destination: oracleTvsByChainMap,
			extraTvlsEnabled,
			toggleOptions
		})

		for (const chain in oracleTvsByChainMap) {
			oracleTvs += oracleTvsByChainMap[chain]
		}

		if (hasAnyPeriodTotals(props.bribeRevenue)) {
			const option = feesOptionsMap.get(FEES_SETTINGS.BRIBES)
			if (option) {
				pushToggleOption(toggleOptions, option)
			}
		}

		if (hasAnyPeriodTotals(props.tokenTax)) {
			const option = feesOptionsMap.get(FEES_SETTINGS.TOKENTAX)
			if (option) {
				pushToggleOption(toggleOptions, option)
			}
		}

		return {
			tvl,
			tvlByChain: Object.entries(tvlByChainMap).sort((a, b) => b[1] - a[1]),
			oracleTvs,
			oracleTvsByChain: Object.entries(oracleTvsByChainMap).sort((a, b) => b[1] - a[1]),
			toggleOptions
		}
	}, [extraTvlsEnabled, props.currentTvlByChain, props.oracleTvs, props.bribeRevenue, props.tokenTax])
}

export const getPrimaryValueLabelType = (category: string) => {
	switch (category) {
		case 'CEX':
			return { title: 'Total Assets', byChainTitle: 'Total Assets by Chain', dataType: 'TotalAssets' }
		case 'Oracle':
			return { title: 'Total Value Secured', byChainTitle: 'TVS by Chain', dataType: 'TVS' }
		default:
			return { title: 'Total Value Locked', byChainTitle: 'TVL by Chain', dataType: 'TVL' }
	}
}

interface TotalsByPeriod {
	total24h?: number | null
	total7d?: number | null
	total30d?: number | null
	total1y?: number | null
	annualized1y?: number | null
	totalAllTime?: number | null
}

const hasAnyPeriodTotals = (totals: TotalsByPeriod | null | undefined) =>
	totals?.total24h != null ||
	totals?.total7d != null ||
	totals?.total30d != null ||
	totals?.total1y != null ||
	totals?.annualized1y != null ||
	totals?.totalAllTime != null

export const getAdjustedTotals = (
	base: TotalsByPeriod | null | undefined,
	bribeRevenue: TotalsByPeriod | null | undefined,
	tokenTax: TotalsByPeriod | null | undefined,
	extraTvlsEnabled: Record<string, boolean>
) => {
	const enabledBribeRevenue = extraTvlsEnabled.bribes ? bribeRevenue : null
	const enabledTokenTax = extraTvlsEnabled.tokentax ? tokenTax : null
	const exists =
		hasAnyPeriodTotals(base) || hasAnyPeriodTotals(enabledBribeRevenue) || hasAnyPeriodTotals(enabledTokenTax)
	if (!exists) return null

	const sumPeriod = (key: keyof TotalsByPeriod) => {
		const baseValue = base?.[key]
		const bribesValue = enabledBribeRevenue?.[key]
		const tokenTaxValue = enabledTokenTax?.[key]
		return addOptionalFeeExtraTotal(baseValue, (bribesValue ?? 0) + (tokenTaxValue ?? 0))
	}

	return {
		total24h: sumPeriod('total24h'),
		total7d: sumPeriod('total7d'),
		total30d: sumPeriod('total30d'),
		total1y: sumPeriod('total1y'),
		annualized1y: sumPeriod('annualized1y'),
		totalAllTime: sumPeriod('totalAllTime')
	}
}
