import { useMemo } from 'react'
import {
	isTvlSettingsKey,
	isFeesSettingKey,
	type TvlSettingsKey,
	type FeesSettingKey,
	updateAllSettingsInLsAndUrl,
	useLocalStorageSettingsManager
} from '~/contexts/LocalStorage'

const isMetricSettingKey = (value: string): value is TvlSettingsKey | FeesSettingKey =>
	isTvlSettingsKey(value) || isFeesSettingKey(value)

export function useProtocolsFilterState(options: { key: string; name: string }[]) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const [extraFeesEnabled] = useLocalStorageSettingsManager('fees')

	const selectedValues = useMemo(() => {
		const filters = options.flatMap((o) => (isMetricSettingKey(o.key) ? [o.key] : []))
		return filters.filter((key) => (isTvlSettingsKey(key) ? extraTvlsEnabled[key] : extraFeesEnabled[key]))
	}, [extraTvlsEnabled, extraFeesEnabled, options])

	const setSelectedValues = (values: string[]) => {
		const newValues: Partial<Record<TvlSettingsKey | FeesSettingKey, boolean>> = {}
		for (const o of options) {
			if (!isMetricSettingKey(o.key)) continue
			newValues[o.key] = values.includes(o.key)
		}
		updateAllSettingsInLsAndUrl(newValues)
	}

	return { selectedValues, setSelectedValues }
}
