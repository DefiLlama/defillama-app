import { useSelectState } from 'ariakit'
import { useGetExtraTvlEnabled, useTvlToggles } from '~/contexts/LocalStorage'
import { options } from './options'

export function useProtocolsFilterState() {
	const tvlToggles = useTvlToggles()

	const extraTvlsEnabled = useGetExtraTvlEnabled()

	const fitlers = options.map((o) => o.key)

	const selectedOptions = fitlers.filter((key) => extraTvlsEnabled[key])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			tvlToggles(off)()
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			tvlToggles(on)()
		}
	}

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		defaultValue: selectedOptions,
		gutter: 6
	})

	return select
}
