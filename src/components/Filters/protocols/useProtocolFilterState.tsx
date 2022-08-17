import { useSelectState } from 'ariakit'
import { useDefiManager } from '~/contexts/LocalStorage'
import { protocolsAndChainsOptions } from './options'

export function useProtocolsFilterState(props?: { [key: string]: any }) {
	const [extraTvlsEnabled, updater] = useDefiManager()

	const fitlers = protocolsAndChainsOptions.map((o) => o.key)

	const selectedOptions = fitlers.filter((key) => extraTvlsEnabled[key])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off)()
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on)()
		}
	}

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		defaultValue: selectedOptions,
		gutter: 6,
		...props
	})

	return select
}
