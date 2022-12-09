import { useRef } from 'react'
import { useRouter } from 'next/router'
import { SelectArrow, useSelectState } from 'ariakit/select'
import { SelectButton, ComboboxSelectPopover, ItemsSelected, SecondaryLabel } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'
import { ComboboxSelectContent } from './ComboboxSelectContent'
import { useComboboxState } from 'ariakit'

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
		...(!subMenu && { animated: true })
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
				<ComboboxSelectContent
					options={tokensList}
					selectedOptions={selectedTokens}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					focusItemRef={focusItemRef}
					variant={variant}
					pathname={pathname}
					autoFocus
					isOptionToggled={isOptionToggled}
					contentElementId={selectState.contentElement?.id}
				/>
			</ComboboxSelectPopover>
		</>
	)
}
