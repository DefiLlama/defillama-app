import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { feesOptions } from './options'
import { useMemo } from 'react'

export function useProtocolsFilterState(options) {
	const [extraTvlsEnabled, updater] = useLocalStorageSettingsManager('tvl')
	const [extraFeesEnabled] = useLocalStorageSettingsManager('fees')

	const { selectedValues } = useMemo(() => {
		const fitlers = options.map((o) => o.key)

		const selectedValues = fitlers.filter((key) => extraTvlsEnabled[key] || extraFeesEnabled[key])

		return { selectedValues }
	}, [extraTvlsEnabled, extraFeesEnabled, options])

	const setSelectedValues = (values) => {
		if (values.length < selectedValues.length) {
			const off = selectedValues.find((o) => !values.includes(o))
			updater(off)
		} else {
			const on = values.find((o) => !selectedValues.includes(o))
			updater(on)
		}
	}

	return { selectedValues, setSelectedValues }
}

export function useFeesFilterState(props?: { [key: string]: any }) {
	const [extraTvlsEnabled, updater] = useLocalStorageSettingsManager('fees')

	const fitlers = feesOptions.map((o) => o.key)

	const selectedValues = fitlers.filter((key) => extraTvlsEnabled[key])

	const setSelectedValues = (values) => {
		if (values.length < selectedValues.length) {
			const off = selectedValues.find((o) => !values.includes(o))
			updater(off)
		} else {
			const on = values.find((o) => !selectedValues.includes(o))
			updater(on)
		}
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
	const [toggledKeys, updater] = useLocalStorageSettingsManager('tvl_fees')

	const fitlers = options.map((o) => o.key)

	const selectedValues = fitlers.filter((key) => toggledKeys[key])

	const setSelectedValues = (values) => {
		if (values.length < selectedValues.length) {
			const off = selectedValues.find((o) => !values.includes(o))
			updater(off)
		} else {
			const on = values.find((o) => !selectedValues.includes(o))
			updater(on)
		}
	}

	return { selectedValues, setSelectedValues }
}
