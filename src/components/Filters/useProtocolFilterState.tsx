import { useMemo } from 'react'
import {
	isDefiSettingKey,
	isFeesSettingKey,
	type DefiSettingKey,
	type FeesSettingKey,
	updateAllSettingsInLsAndUrl,
	useLocalStorageSettingsManager
} from '~/contexts/LocalStorage'
import { feesOptions } from './options'

const isMetricSettingKey = (value: string): value is DefiSettingKey | FeesSettingKey =>
	isDefiSettingKey(value) || isFeesSettingKey(value)

export function useProtocolsFilterState(options: { key: string; name: string }[]) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const [extraFeesEnabled] = useLocalStorageSettingsManager('fees')

	const selectedValues = useMemo(() => {
		const filters = options.map((o) => o.key).filter(isMetricSettingKey)
		return filters.filter((key) => (isDefiSettingKey(key) ? extraTvlsEnabled[key] : extraFeesEnabled[key]))
	}, [extraTvlsEnabled, extraFeesEnabled, options])

	const setSelectedValues = (values: string[]) => {
		const newValues: Partial<Record<DefiSettingKey | FeesSettingKey, boolean>> = {}
		for (const o of options) {
			if (!isMetricSettingKey(o.key)) continue
			newValues[o.key] = values.includes(o.key)
		}
		updateAllSettingsInLsAndUrl(newValues)
	}

	return { selectedValues, setSelectedValues }
}

export function useFeesFilterState(_props?: { [key: string]: any }) {
	const [extraTvlsEnabled, _updater] = useLocalStorageSettingsManager('fees')

	const filters = feesOptions.map((o) => o.key)

	const selectedValues = filters.filter((key) => extraTvlsEnabled[key])

	const setSelectedValues = (values: string[]) => {
		const newValues: Partial<Record<FeesSettingKey, boolean>> = {}
		for (const o of feesOptions) {
			newValues[o.key] = values.includes(o.key)
		}
		updateAllSettingsInLsAndUrl(newValues)
	}

	return { selectedValues, setSelectedValues }
}

export function useTvlAndFeesFilterState({
	options
}: {
	options: {
		name: string
		key: string
		help?: string
	}[]
}) {
	const [toggledKeys] = useLocalStorageSettingsManager('tvl_fees')

	const filters = options.map((o) => o.key).filter(isMetricSettingKey)

	const selectedValues = filters.filter((key) => toggledKeys[key])

	const setSelectedValues = (values: string[]) => {
		const newValues: Partial<Record<DefiSettingKey | FeesSettingKey, boolean>> = {}
		for (const o of options) {
			if (!isMetricSettingKey(o.key)) continue
			newValues[o.key] = values.includes(o.key)
		}
		updateAllSettingsInLsAndUrl(newValues)
	}

	return { selectedValues, setSelectedValues }
}
