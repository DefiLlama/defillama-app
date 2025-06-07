import { updateAllSettingsInLsAndUrl, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { feesOptions } from './options'
import { useMemo } from 'react'

export function useProtocolsFilterState(options) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const [extraFeesEnabled] = useLocalStorageSettingsManager('fees')

	const { selectedValues } = useMemo(() => {
		const fitlers = options.map((o) => o.key)

		const selectedValues = fitlers.filter((key) => extraTvlsEnabled[key] || extraFeesEnabled[key])

		return { selectedValues }
	}, [extraTvlsEnabled, extraFeesEnabled, options])

	const setSelectedValues = (values) => {
		const newValues = {}
		for (const o of options) {
			newValues[o.key] = values.includes(o.key) ? true : false
		}
		updateAllSettingsInLsAndUrl(newValues)
	}

	return { selectedValues, setSelectedValues }
}

export function useFeesFilterState(props?: { [key: string]: any }) {
	const [extraTvlsEnabled, updater] = useLocalStorageSettingsManager('fees')

	const fitlers = feesOptions.map((o) => o.key)

	const selectedValues = fitlers.filter((key) => extraTvlsEnabled[key])

	const setSelectedValues = (values) => {
		const newValues = {}
		for (const o of feesOptions) {
			newValues[o.key] = values.includes(o.key) ? true : false
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

	const fitlers = options.map((o) => o.key)

	const selectedValues = fitlers.filter((key) => toggledKeys[key])

	const setSelectedValues = (values) => {
		const newValues = {}
		for (const o of options) {
			newValues[o.key] = values.includes(o.key) ? true : false
		}
		updateAllSettingsInLsAndUrl(newValues)
	}

	return { selectedValues, setSelectedValues }
}
