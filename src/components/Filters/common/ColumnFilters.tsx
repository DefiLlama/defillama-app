import { useRouter } from 'next/router'
import { MenuButtonArrow, useSelectState } from 'ariakit'
import { ItemsSelected, SelectButton, SecondaryLabel, SelectPopover, SelectContent } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IColumnFiltersProps {
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
	show7dBaseApy?: boolean
	show7dIL?: boolean
	show1dVolume?: boolean
	show7dVolume?: boolean
	showInceptionApy?: boolean
	showBorrowBaseApy?: boolean
	showBorrowRewardApy?: boolean
	showNetBorrowApy?: boolean
	showLTV?: boolean
	showTotalSupplied?: boolean
	showTotalBorrowed?: boolean
	showAvailable?: boolean
}

const optionalFilters = [
	{ name: '7d Base APY', key: 'show7dBaseApy' },
	{ name: '7d IL', key: 'show7dIL' },
	{ name: '1d Volume', key: 'show1dVolume' },
	{ name: '7d Volume', key: 'show7dVolume' },
	{ name: 'Inception APY', key: 'showInceptionApy' },
	{ name: 'Borrow Base', key: 'showBorrowBaseApy' },
	{ name: 'Borrow Reward', key: 'showBorrowRewardApy' },
	{ name: 'Net Borrow', key: 'showNetBorrowApy' },
	{ name: 'LTV', key: 'showLTV' },
	{ name: 'Supplied', key: 'showTotalSupplied' },
	{ name: 'Borrowed', key: 'showTotalBorrowed' },
	{ name: 'Available', key: 'showAvailable' }
]

export function ColumnFilters({ variant = 'primary', subMenu, ...props }: IColumnFiltersProps) {
	const router = useRouter()

	const {
		show7dBaseApy,
		show7dIL,
		show1dVolume,
		show7dVolume,
		showInceptionApy,
		showNetBorrowApy,
		showBorrowBaseApy,
		showBorrowRewardApy,
		showLTV,
		showTotalSupplied,
		showTotalBorrowed,
		showAvailable,
		...queries
	} = router.query

	const options = optionalFilters.filter((op) => props[op.key])

	const selectedOptions = options.filter((option) => router.query[option.key] === 'true').map((op) => op.key)

	const addOption = (newOptions) => {
		router.push(
			{
				pathname: router.pathname,
				query: { ...queries, ...Object.fromEntries(newOptions.map((op) => [op, true])) }
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: selectedOptions,
		setValue: addOption,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: true })
	})

	const toggleAllOptions = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					...Object.fromEntries(options.map((op) => [op.key, true]))
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllOptions = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const isSelected = selectedOptions.length > 0

	if (subMenu) {
		return (
			<SlidingMenu label="Columns" selectState={selectState}>
				<SelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={router.pathname}
					variant={variant}
				/>
			</SlidingMenu>
		)
	}

	const selectedOptionNames = selectedOptions.map((op) => optionalFilters.find((x) => x.key === op)?.name ?? op)

	return (
		<>
			<SelectButton state={selectState} data-variant={variant}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>Columns: </span>
								<span data-selecteditems>
									{selectedOptionNames.length > 2
										? `${selectedOptionNames[0]} + ${selectedOptionNames.length - 1} others`
										: selectedOptionNames.join(', ')}
								</span>
							</>
						) : (
							'Columns'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Columns</span>
						{isSelected && <ItemsSelected>{selectedOptionNames.length}</ItemsSelected>}
					</>
				)}

				<MenuButtonArrow />
			</SelectButton>

			<SelectPopover state={selectState} modal={!isLarge} data-variant={variant}>
				<SelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={router.pathname}
					variant={variant}
				/>
			</SelectPopover>
		</>
	)
}

export function ColumnFilters2({
	label,
	variant = 'primary',
	subMenu,
	clearAllOptions,
	toggleAllOptions,
	selectedOptions,
	options,
	addOption
}) {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: selectedOptions,
		setValue: addOption,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: true })
	})

	if (subMenu) {
		return (
			<SlidingMenu label="Columns" selectState={selectState}>
				<SelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={null}
					variant={variant}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<SelectButton state={selectState} data-variant={variant} style={{ borderRadius: '12px' }}>
				<span>{label}</span>
				<ItemsSelected>{selectedOptions.length}</ItemsSelected>

				<MenuButtonArrow />
			</SelectButton>

			<SelectPopover state={selectState} modal={!isLarge} data-variant={variant}>
				<SelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={null}
					variant={variant}
				/>
			</SelectPopover>
		</>
	)
}
