import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { SelectButton, ComboboxSelectPopover, SelectItem, ItemsSelected, FilterFnsGroup, SecondaryLabel } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IFiltersByChainProps {
	tokensList: string[]
	selectedTokens: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
}

export function FiltersByToken({
	tokensList = [],
	selectedTokens,
	pathname,
	variant = 'primary'
}: IFiltersByChainProps) {
	const router = useRouter()

	const { token, ...queries } = router.query

	const addToken = (newChain) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					token: newChain
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: tokensList })

	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		...selectProps,
		value: selectedTokens,
		setValue: addToken,
		gutter: 8,
		animated: true,
		renderCallback
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const toggleAll = () => {
		if (!token || token === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						token: undefined
					}
				},
				undefined,
				{ shallow: true }
			)
		} else {
			router.push(
				{
					pathname,
					query: {
						...queries,
						token: 'All'
					}
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const clear = () => {
		select.up(1)
		router.push(
			{
				pathname,
				query: {
					...queries,
					token: undefined
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const focusItemRef = useRef(null)

	const isSelected = selectedTokens.length > 0 && selectedTokens.length !== tokensList.length

	return (
		<>
			<SelectButton state={select} data-variant={variant}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>Token: </span>
								<span data-selecteditems>
									{selectedTokens.length > 2
										? `${selectedTokens[0]} + ${selectedTokens.length - 1} others`
										: selectedTokens.join(', ')}
								</span>
							</>
						) : (
							'Token'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Tokens</span>
						{isSelected && <ItemsSelected>{selectedTokens.length}</ItemsSelected>}
					</>
				)}
				<MenuButtonArrow />
			</SelectButton>
			<ComboboxSelectPopover
				state={select}
				modal={!isLarge}
				composite={false}
				initialFocusRef={focusItemRef}
				data-variant={variant}
			>
				<Input state={combobox} placeholder="Search for tokens..." autoFocus />

				{combobox.matches.length > 0 ? (
					<>
						<FilterFnsGroup data-variant={variant}>
							<button onClick={clear}>Clear</button>

							<button onClick={toggleAll}>Toggle all</button>
						</FilterFnsGroup>
						<List state={combobox} className="filter-by-list">
							{combobox.matches.slice(0, 100).map((value, i) => (
								<SelectItem
									value={value}
									key={value + i}
									ref={i === 0 && selectedTokens.length === tokensList.length ? focusItemRef : null}
									focusOnHover
								>
									<span data-name>{value}</span>
									<Checkbox checked={select.value.includes(value) || (token || []).includes('All')} />
								</SelectItem>
							))}
						</List>
					</>
				) : (
					<p id="no-results">No results</p>
				)}
			</ComboboxSelectPopover>
		</>
	)
}
