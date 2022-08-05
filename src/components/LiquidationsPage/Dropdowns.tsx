/* eslint-disable no-unused-vars*/

import styled from 'styled-components'
import useSWR from 'swr'
import { fetcher } from '~/utils/useSWR'
import React, { useState } from 'react'
import { FilterButton, FilterPopover } from '../Select/AriakitSelect'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Dropdown, Item, Selected, Stats } from '../Filters/shared'
import { useRouter } from 'next/router'
import { ChartState, defaultChartState } from './utils'
import { useLiquidationsState } from '~/utils/liquidations'
import { Input, List } from '~/components/Combobox'

const Dropdowns = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;

	button {
		font-weight: 400;
	}
`

export type DropdownOption = {
	name: string
	key: string
}
// const ProtocolsDropdown = ({ options }: { options: DropdownOption[] }) => {
// 	return <h3>Protocols filter</h3>
// }
// const ChainsDropdown = ({ options }: { options: DropdownOption[] }) => {
// 	return <h3>Chains filter</h3>
// }
export const LiquidationsChartFilters = () => {
	const { aggregateBy } = useLiquidationsState()

	const { data } = useSWR<DropdownOption[]>(
		`http://localhost:3000/api/mock-liquidations-options?aggregateBy${aggregateBy}`,
		fetcher
	)
	return (
		<Dropdowns>
			{/* {data && (aggregateBy === 'protocol' ? <ProtocolsDropdown options={data} /> : <ChainsDropdown options={data} />)} */}
			{data && <FiltersByChain optionsList={data} aggregateBy={aggregateBy} />}
		</Dropdowns>
	)
}

export function FiltersByChain({
	optionsList,
	aggregateBy
}: {
	optionsList: DropdownOption[]
	aggregateBy: 'protocol' | 'chain'
}) {
	const { filters, setFilters } = useLiquidationsState()

	const updateFilters = (newFilters: string[]) => {
		if (newFilters.length > 1) {
			setFilters(newFilters.filter((f) => f !== 'all'))
		}
	}

	const combobox = useComboboxState({ list: optionsList.map((p) => p.key) })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox
	const select = useSelectState({
		...selectProps,
		value: filters,
		setValue: updateFilters,
		gutter: 8
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const toggleAll = () => {
		setFilters(['all'])
	}

	const clear = () => {
		setFilters(['none'])
	}

	return (
		<>
			<FilterButton state={select}>
				<span>Filter by {aggregateBy === 'protocol' ? 'chain' : 'protocol'}</span>
				<MenuButtonArrow />
				{filters.length > 0 && <Selected>{filters.length}</Selected>}
			</FilterButton>
			<Dropdown state={select}>
				<Input state={combobox} placeholder={`Search for ${aggregateBy === 'protocol' ? 'chain' : 'protocol'}...`} />

				{combobox.matches.length > 0 ? (
					<>
						<Stats>
							<button onClick={clear}>clear</button>

							<button onClick={toggleAll}>toggle all</button>
						</Stats>
						<List state={combobox} className="filter-by-list">
							{combobox.matches.map((value, i) => (
								<Item value={value} key={value + i} focusOnHover>
									<span>{value}</span>
									<Checkbox checked={select.value.includes(value) ? true : false} />
								</Item>
							))}
						</List>
					</>
				) : (
					<p id="no-results">No results</p>
				)}
			</Dropdown>
		</>
	)
}
