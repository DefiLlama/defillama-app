import { MutableRefObject, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { SelectArrow, SelectState, useSelectState } from 'ariakit/select'
import { Checkbox } from '~/components'
import { SelectButton, ComboboxSelectPopover, SelectItem, ItemsSelected, FilterFnsGroup, SecondaryLabel } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'
import { useDebounce } from '~/hooks'

interface IFiltersByChainProps {
	tokensList: string[]
	selectedTokens: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

interface IPopovercontent extends IFiltersByChainProps {
	autoFocus?: boolean
	selectState: SelectState<any>
	selectedTokens: Array<string>
	focusItemRef: MutableRefObject<any>
}

export function FiltersByToken({
	tokensList = [],
	selectedTokens,
	pathname,
	variant = 'primary',
	subMenu
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

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: selectedTokens,
		setValue: addToken,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: true })
	})

	const focusItemRef = useRef(null)

	const isSelected = selectedTokens.length > 0 && selectedTokens.length !== tokensList.length

	if (subMenu) {
		return (
			<SlidingMenu label="Tokens" selectState={selectState}>
				<Popovercontent
					tokensList={tokensList}
					selectedTokens={selectedTokens}
					focusItemRef={focusItemRef}
					selectState={selectState}
					variant={variant}
					pathname={pathname}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<SelectButton state={selectState} data-variant={variant}>
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
				<SelectArrow placement="bottom" />
			</SelectButton>
			<ComboboxSelectPopover
				state={selectState}
				modal={!isLarge}
				composite={false}
				initialFocusRef={focusItemRef}
				data-variant={variant}
			>
				<Popovercontent
					tokensList={tokensList}
					selectedTokens={selectedTokens}
					focusItemRef={focusItemRef}
					selectState={selectState}
					variant={variant}
					pathname={pathname}
					autoFocus
				/>
			</ComboboxSelectPopover>
		</>
	)
}

const Popovercontent = ({
	autoFocus,
	tokensList,
	pathname,
	selectState,
	selectedTokens,
	variant,
	focusItemRef
}: IPopovercontent) => {
	const [inputValue, setInputValue] = useState('')

	const router = useRouter()

	const { token, ...queries } = router.query

	const toggleAll = () => {
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

	const clear = () => {
		selectState.up(1)
		router.push(
			{
				pathname,
				query: {
					...queries
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const debouncedInputValue = useDebounce(inputValue, 300)

	const options = useMemo(() => {
		if (debouncedInputValue.length > 0) {
			const searchValue = debouncedInputValue.toLowerCase()
			return tokensList.filter((token) => token.toLowerCase().includes(searchValue))
		}
		return tokensList
	}, [tokensList, debouncedInputValue])

	return (
		<>
			<input
				className="combobox-input"
				onChange={(e) => setInputValue(e.target.value)}
				placeholder="Search..."
				role="combobox"
				autoFocus={autoFocus}
				aria-expanded={true}
				aria-haspopup="listbox"
				aria-controls={selectState.contentElement?.id}
			/>

			{options.length > 0 ? (
				<>
					<FilterFnsGroup data-variant={variant}>
						<button onClick={clear}>Clear</button>

						<button onClick={toggleAll}>Toggle all</button>
					</FilterFnsGroup>
					<div className="select-options-wrapper">
						{options.slice(0, 100).map((value, i) => (
							<SelectItem
								value={value}
								key={value + i}
								ref={i === 0 && selectedTokens.length === tokensList.length ? focusItemRef : null}
								focusOnHover
							>
								<span data-name>{value}</span>
								<Checkbox checked={selectState.value.includes(value) || (token || []).includes('All')} />
							</SelectItem>
						))}
					</div>
				</>
			) : (
				<p id="no-results">No results</p>
			)}
		</>
	)
}
