import { useRef } from 'react'
import { useRouter } from 'next/router'
import { Select, SelectArrow, SelectPopover, useSelectState } from 'ariakit/select'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'
import { ComboboxSelectContent } from './ComboboxSelectContent'
import { useComboboxState } from 'ariakit/combobox'

interface IFiltersByTokensProps {
	tokensList: Array<string>
	selectedTokens: Array<string>
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function FiltersByToken({
	tokensList = [],
	selectedTokens,
	pathname,
	variant = 'primary',
	subMenu
}: IFiltersByTokensProps) {
	const router = useRouter()

	const { token, ...queries } = router.query

	const addToken = (newToken) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					token: newToken
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

	const selectState = useSelectState({
		...selectProps,
		value: selectedTokens,
		setValue: addToken,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: isLarge ? false : true })
	})

	const toggleAllOptions = () => {
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

	const clearAllOptions = () => {
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

	const selectOnlyOne = (option: string) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					token: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const focusItemRef = useRef(null)

	const isSelected = selectedTokens.length > 0 && selectedTokens.length !== tokensList.length

	const isOptionToggled = (option) => selectState.value.includes(option) || (token || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label="Tokens" selectState={selectState}>
				<ComboboxSelectContent
					options={tokensList}
					selectedOptions={selectedTokens}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					selectOnlyOne={selectOnlyOne}
					focusItemRef={focusItemRef}
					variant={variant}
					pathname={pathname}
					isOptionToggled={isOptionToggled}
					contentElementId={selectState.contentElement?.id}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<Select
				state={selectState}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap"
			>
				{isSelected ? (
					<>
						<span>Token: </span>
						<span className="text-[var(--link)]">
							{selectedTokens.length > 2
								? `${selectedTokens[0]} + ${selectedTokens.length - 1} others`
								: selectedTokens.join(', ')}
						</span>
					</>
				) : (
					<span>Token</span>
				)}
				<SelectArrow />
			</Select>

			{selectState.mounted ? (
				<SelectPopover
					state={selectState}
					composite={false}
					initialFocusRef={focusItemRef}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh]"
				>
					<ComboboxSelectContent
						options={tokensList}
						selectedOptions={selectedTokens}
						clearAllOptions={clearAllOptions}
						toggleAllOptions={toggleAllOptions}
						selectOnlyOne={selectOnlyOne}
						focusItemRef={focusItemRef}
						variant={variant}
						pathname={pathname}
						autoFocus
						isOptionToggled={isOptionToggled}
						contentElementId={selectState.contentElement?.id}
					/>
				</SelectPopover>
			) : null}
		</>
	)
}
