import { useRef } from 'react'
import { useRouter } from 'next/router'
import { Select, SelectArrow, SelectPopover, useSelectState } from 'ariakit/select'
import { useComboboxState } from 'ariakit/combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { ComboboxSelectContent } from '../common/ComboboxSelectContent'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IFiltersByChainsProps {
	chains: string[]
	selectedChains: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function Chains({ chains = [], selectedChains, pathname, variant = 'primary', subMenu }: IFiltersByChainsProps) {
	const router = useRouter()

	const { chain, ...queries } = router.query

	const addChain = (newChain) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: newChain
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: chains })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedChains,
		setValue: addChain,
		gutter: 8,
		animated: isLarge ? false : true,
		renderCallback
	})

	const toggleAllOptions = () => {
		if (!chain || chain === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						chain: 'None'
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
						chain: 'All'
					}
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const clearAllOptions = () => {
		selectState.up(1)
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: 'None'
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
					chain: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	// Resets combobox value when popover is collapsed
	if (!selectState.mounted && combobox.value) {
		combobox.setValue('')
	}

	const focusItemRef = useRef(null)

	const isSelected = selectedChains.length > 0 && selectedChains.length !== chains.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (chain || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label="Chains" selectState={selectState}>
				<ComboboxSelectContent
					options={chains}
					selectedOptions={selectedChains}
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
						<span>Chain: </span>
						<span className="text-[var(--link)]">
							{selectedChains.length > 2
								? `${selectedChains[0]} + ${selectedChains.length - 1} others`
								: selectedChains.join(', ')}
						</span>
					</>
				) : (
					'Chain'
				)}

				<SelectArrow />
			</Select>

			{selectState.mounted ? (
				<SelectPopover
					state={selectState}
					composite={false}
					initialFocusRef={focusItemRef}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<ComboboxSelectContent
						options={chains}
						selectedOptions={selectedChains}
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
