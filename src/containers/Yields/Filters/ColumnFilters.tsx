import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IColumnFiltersProps {
	nestedMenu?: boolean
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
	{ name: 'Borrow Base APY', key: 'showBorrowBaseApy' },
	{ name: 'Borrow Reward APY', key: 'showBorrowRewardApy' },
	{ name: 'Net Borrow APY', key: 'showNetBorrowApy' },
	{ name: 'Max LTV', key: 'showLTV' },
	{ name: 'Supplied', key: 'showTotalSupplied' },
	{ name: 'Borrowed', key: 'showTotalBorrowed' },
	{ name: 'Available', key: 'showAvailable' }
]

export function ColumnFilters({ nestedMenu, ...props }: IColumnFiltersProps) {
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

	const { options, selectedOptions } = useMemo(() => {
		const options = optionalFilters.filter((op) => props[op.key])

		const selectedOptions = options.filter((option) => router.query[option.key] === 'true').map((op) => op.key)

		return { options, selectedOptions }
	}, [router.query])

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

	const addOnlyOneOption = (newOption) => {
		router.push(
			{
				pathname: router.pathname,
				query: { ...queries, [newOption]: true }
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const toggleAll = () => {
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

	const clearAll = () => {
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

	return (
		<SelectWithCombobox
			allValues={options}
			selectedValues={selectedOptions}
			setSelectedValues={addOption}
			selectOnlyOne={addOnlyOneOption}
			toggleAll={toggleAll}
			clearAll={clearAll}
			nestedMenu={nestedMenu}
			label="Columns"
		/>
	)
}
