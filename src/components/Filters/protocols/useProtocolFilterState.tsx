import { useSelectState } from 'ariakit'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { useDefiManager, useFeesManager, useTvlAndFeesManager } from '~/contexts/LocalStorage'
import { feesOptions, protocolsAndChainsOptions } from './options'

export function useProtocolsFilterState(props?: { [key: string]: any }) {
	const [extraTvlsEnabled, updater] = useDefiManager()

	const fitlers = protocolsAndChainsOptions.map((o) => o.key)

	const selectedOptions = fitlers.filter((key) => extraTvlsEnabled[key])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off, true)()
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on, true)()
		}
	}

	const [, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		defaultValue: selectedOptions,
		gutter: 6,
		animated: true,
		renderCallback,
		...props
	})

	return select
}

export function useFeesFilterState(props?: { [key: string]: any }) {
	const [extraTvlsEnabled, updater] = useFeesManager()

	const fitlers = feesOptions.map((o) => o.key)

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

	const [, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		defaultValue: selectedOptions,
		gutter: 6,
		animated: true,
		renderCallback,
		...props
	})

	return select
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
	const [toggledKeys, updater] = useTvlAndFeesManager()

	const fitlers = options.map((o) => o.key)

	const selectedOptions = fitlers.filter((key) => toggledKeys[key])

	const onChange = (values) => {
		if (values.length < selectedOptions.length) {
			const off = selectedOptions.find((o) => !values.includes(o))
			updater(off)()
		} else {
			const on = values.find((o) => !selectedOptions.includes(o))
			updater(on)()
		}
	}

	const [, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		value: selectedOptions,
		setValue: onChange,
		defaultValue: selectedOptions,
		gutter: 6,
		animated: true,
		renderCallback,
		sameWidth: true
	})

	return select
}
