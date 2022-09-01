import { MenuButtonArrow, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { STABLECOINS_SETTINGS, useStablecoinsManager } from '~/contexts/LocalStorage'
import { SelectItem, FilterFnsGroup, SelectButton, SelectPopover, ItemsSelected } from '../shared'

export const options = [
	{
		name: 'USD',
		key: STABLECOINS_SETTINGS.PEGGEDUSD,
		help: 'Show stablecoins pegged to USD'
	},
	{
		name: 'EUR',
		key: STABLECOINS_SETTINGS.PEGGEDEUR,
		help: 'Show stablecoins pegged to EUR'
	},
	{
		name: 'Variable',
		key: STABLECOINS_SETTINGS.PEGGEDVAR,
		help: 'Show stablecoins with a variable or floating peg'
	}
]

export function PegType() {
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

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		value: values,
		setValue: updateAttributes,
		gutter: 8,
		animated: true,
		renderCallback
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

	const totalSelected = values.length

	return (
		<>
			<SelectButton state={select}>
				<span>Filter by Peg Type</span>
				<MenuButtonArrow />
				{totalSelected > 0 && <ItemsSelected>{totalSelected}</ItemsSelected>}
			</SelectButton>
			<SelectPopover state={select} modal={!isLarge}>
				<FilterFnsGroup>
					<button onClick={clear}>Clear</button>

					<button onClick={toggleAll}>Toggle all</button>
				</FilterFnsGroup>
				{options.map((option) => (
					<SelectItem key={option.key} value={option.key}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key)} />
					</SelectItem>
				))}
			</SelectPopover>
		</>
	)
}
