import * as React from 'react'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { ApplyFilters, Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton, FilterItem, FilterPopover } from '~/components/Select/AriakitSelect'

interface IFiltersByChainProps {
	chains: string[]
	setChainsToFilter: React.Dispatch<React.SetStateAction<string[]>>
}

const Dropdown = styled(FilterPopover)`
	max-height: 320px;

	#no-results {
		margin-top: 24px;
	}

	.filter-by-chain-list {
		padding: 0;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		width: 100%;
		max-width: 280px;
	}
`

const Item = styled(FilterItem)`
	&:first-of-type,
	&:last-of-type {
		border-radius: 0;
	}
`

const Stats = styled.span`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px;
	font-size: 0.75rem;
	border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};

	p {
		color: ${({ theme }) => theme.text2};
	}

	button {
		padding: 4px;
		color: ${({ theme }) => theme.primary1};
	}
`

export function FiltersByChain({ chains = [], setChainsToFilter }: IFiltersByChainProps) {
	const combobox = useComboboxState({ list: chains })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox
	const select = useSelectState({
		...selectProps,
		defaultValue: chains,
		gutter: 8
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const filterChains = () => {
		setChainsToFilter(select.value)
	}

	const toggleAll = () => {
		select.setValue(select.value.length === chains.length ? [] : chains)
	}

	return (
		<>
			<FilterButton state={select}>
				Filter by Chain
				<MenuButtonArrow />
			</FilterButton>
			<Dropdown state={select}>
				<Input state={combobox} placeholder="Search..." />

				{combobox.matches.length > 0 ? (
					<>
						<Stats>
							<p>{`${select.value.length} selected`}</p>
							<button onClick={toggleAll}>toggle all</button>
						</Stats>
						<List state={combobox} className="filter-by-chain-list">
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

				<ApplyFilters onClick={filterChains}>Apply Filters</ApplyFilters>
			</Dropdown>
		</>
	)
}
