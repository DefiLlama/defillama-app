import { MenuButtonArrow, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import { yieldOptions } from '~/components/Settings'
import { useLocalStorageContext } from '~/contexts/LocalStorage'
import { Item, Stats } from '../shared'

export function YieldAttributes() {
	const [state, { updateKey }] = useLocalStorageContext()

	const updateAttributes = (updatedValues) => {
		yieldOptions.forEach((option) => {
			const isSelected = updatedValues.includes(option.key)

			const isEnabled = state[option.key]

			if ((isEnabled && !isSelected) || (!isEnabled && isSelected)) {
				updateKey(option.key, !isEnabled)
			}
		})
	}

	const values = yieldOptions.filter((o) => state[o.key]).map((o) => o.key)

	const select = useSelectState({
		value: values,
		setValue: updateAttributes,
		gutter: 8
	})

	const toggleAll = () => {
		yieldOptions.forEach((option) => {
			const isEnabled = state[option.key]

			if (!isEnabled) {
				updateKey(option.key, true)
			}
		})
	}

	const clear = () => {
		yieldOptions.forEach((option) => {
			const isEnabled = state[option.key]

			if (isEnabled) {
				updateKey(option.key, false)
			}
		})
	}

	return (
		<>
			<FilterButton state={select}>
				<span>Filter by Attribute</span>
				<MenuButtonArrow />
			</FilterButton>
			<FilterPopover state={select}>
				<Stats>
					<button onClick={clear}>clear</button>

					<button onClick={toggleAll}>toggle all</button>
				</Stats>
				{yieldOptions.map((option) => (
					<Item key={option.key} value={option.key}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key)} />
					</Item>
				))}
			</FilterPopover>
		</>
	)
}
