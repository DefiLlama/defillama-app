import { MenuButtonArrow, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import {
	AUDITED,
	MILLION_DOLLAR,
	NO_IL,
	SINGLE_EXPOSURE,
	STABLECOINS,
	NO_OUTLIER,
	APY_GT0,
	useLocalStorageContext
} from '~/contexts/LocalStorage'
import { Item, Selected, Stats } from '../shared'

export const options = [
	{
		name: 'Stablecoins',
		key: STABLECOINS,
		help: 'Select pools consisting of stablecoins only'
	},
	{
		name: 'Single Exposure',
		key: SINGLE_EXPOSURE,
		help: 'Select pools with single token exposure only'
	},
	{
		name: 'No IL',
		key: NO_IL,
		help: 'Select pools with no impermanent loss'
	},
	{
		name: 'Million Dollar',
		key: MILLION_DOLLAR,
		help: 'Select pools with at least one million dollar in TVL'
	},
	{
		name: 'Audited',
		key: AUDITED,
		help: 'Select pools from audited projects only'
	},
	{
		name: 'No Outliers',
		key: NO_OUTLIER,
		help: 'Remove pools which are considered outliers based on their geometric mean of apy values'
	},
	{
		name: 'APY > 0',
		key: APY_GT0,
		help: 'Remove pools with apy values of 0'
	}
]

export function YieldAttributes() {
	const [state, { updateKey }] = useLocalStorageContext()

	const updateAttributes = (updatedValues) => {
		options.forEach((option) => {
			const isSelected = updatedValues.includes(option.key)

			const isEnabled = state[option.key]

			if ((isEnabled && !isSelected) || (!isEnabled && isSelected)) {
				updateKey(option.key, !isEnabled)
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
				updateKey(option.key, true)
			}
		})
	}

	const clear = () => {
		options.forEach((option) => {
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
				{values.length > 0 && <Selected>{values.length}</Selected>}
			</FilterButton>
			<FilterPopover state={select}>
				<Stats>
					<button onClick={clear}>clear</button>

					<button onClick={toggleAll}>toggle all</button>
				</Stats>
				{options.map((option) => (
					<Item key={option.key} value={option.key}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key)} />
					</Item>
				))}
			</FilterPopover>
		</>
	)
}
