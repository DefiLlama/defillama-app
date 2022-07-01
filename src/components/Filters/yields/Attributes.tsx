import { useState } from 'react'
import { MenuButtonArrow, useSelectState } from 'ariakit'
import { ApplyFilters, Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { FilterButton, FilterItem, FilterPopover } from '~/components/Select/AriakitSelect'
import {
	AUDITED,
	MILLION_DOLLAR,
	NO_IL,
	SINGLE_EXPOSURE,
	STABLECOINS,
	useLocalStorageContext
} from '~/contexts/LocalStorage'
import { Stats } from '../shared'

const options = [
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
	}
]

export function YieldAttributes() {
	const [state, { updateKey }] = useLocalStorageContext()

	const [value, setValue] = useState<string[]>(options.map((o) => o.key).filter((o) => state[o]))

	const select = useSelectState({
		value,
		setValue: (values) => setValue(values),
		gutter: 8
	})

	const updateAttributes = () => {
		options.forEach((option) => {
			const isSelected = value.includes(option.key)
			const isEnabled = state[option.key]

			if ((isEnabled && !isSelected) || (!isEnabled && isSelected)) {
				updateKey(option.key, !isEnabled)
			}
		})
	}

	const toggleAll = () => {
		select.setValue(select.value.length === options.length ? [] : options.map((o) => o.key))
	}

	return (
		<>
			<FilterButton state={select}>
				Filter by Attribute
				<MenuButtonArrow />
			</FilterButton>
			<FilterPopover state={select}>
				<Stats>
					<p>{`${select.value.length} selected`}</p>
					<button onClick={toggleAll}>toggle all</button>
				</Stats>
				{options.map((option) => (
					<FilterItem key={option.key} value={option.key}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={value.includes(option.key)} />
					</FilterItem>
				))}
				<ApplyFilters onClick={updateAttributes}>Apply Filters</ApplyFilters>
			</FilterPopover>
		</>
	)
}
