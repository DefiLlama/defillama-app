import { MenuButtonArrow, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { STABLECOINS_SETTINGS, useStablecoinsManager } from '~/contexts/LocalStorage'
import { DropdownItem, FilterFnsGroup, FilterButton, FilterPopover } from '../shared'

export const options = [
	{
		name: 'Fiat',
		key: STABLECOINS_SETTINGS.FIATSTABLES,
		help: 'Show stablecoins backed by fiat'
	},
	{
		name: 'Crypto',
		key: STABLECOINS_SETTINGS.CRYPTOSTABLES,
		help: 'Show stablecoins backed by crypto'
	},
	{
		name: 'Algorithmic',
		key: STABLECOINS_SETTINGS.ALGOSTABLES,
		help: 'Show algorithmic stablecoins'
	}
]

export function BackingType() {
	const [state, updater] = useStablecoinsManager()

	const updateAttributes = (updatedValues) => {
		options.forEach((option) => {
			const isSelected = updatedValues.includes(option.key)

			const isEnabled = state[option.key]

			if ((isEnabled && !isSelected) || (!isEnabled && isSelected)) {
				updater(option.key)()
			}
		})
	}

	const values = options.filter((o) => state[o.key]).map((o) => o.key)

	const select = useSelectState({
		value: values,
		setValue: updateAttributes,
		gutter: 8
	})

	const toggleAll = () => {
		options.forEach((option) => {
			const isEnabled = state[option.key]

			if (!isEnabled) {
				updater(option.key)()
			}
		})
	}

	const clear = () => {
		options.forEach((option) => {
			const isEnabled = state[option.key]

			if (isEnabled) {
				updater(option.key)()
			}
		})
	}

	return (
		<>
			<FilterButton state={select}>
				<span>Filter by Backing</span>
				<MenuButtonArrow />
			</FilterButton>
			<FilterPopover state={select}>
				<FilterFnsGroup>
					<button onClick={clear}>clear</button>

					<button onClick={toggleAll}>toggle all</button>
				</FilterFnsGroup>
				{options.map((option) => (
					<DropdownItem key={option.key} value={option.key}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key)} />
					</DropdownItem>
				))}
			</FilterPopover>
		</>
	)
}
