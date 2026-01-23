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
		show7dBaseApy: _show7dBaseApy,
		show7dIL: _show7dIL,
		show1dVolume: _show1dVolume,
		show7dVolume: _show7dVolume,
		showInceptionApy: _showInceptionApy,
		showNetBorrowApy: _showNetBorrowApy,
		showBorrowBaseApy: _showBorrowBaseApy,
		showBorrowRewardApy: _showBorrowRewardApy,
		showLTV: _showLTV,
		showTotalSupplied: _showTotalSupplied,
		showTotalBorrowed: _showTotalBorrowed,
		showAvailable: _showAvailable,
		...queries
	} = router.query

	const { options, selectedOptions } = useMemo(() => {
		const options = optionalFilters.filter((op) => props[op.key])

		const selectedOptions = options.filter((option) => router.query[option.key] === 'true').map((op) => op.key)

		return { options, selectedOptions }
	}, [router.query, props])

	const setSelectedOptions = (newOptions: string[]) => {
		const optionsObj: Record<string, boolean> = {}
		for (const op of newOptions) {
			optionsObj[op] = true
		}
		router.push(
			{
				pathname: router.pathname,
				query: { ...queries, ...optionsObj }
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	return (
		<SelectWithCombobox
			allValues={options}
			selectedValues={selectedOptions}
			setSelectedValues={setSelectedOptions}
			nestedMenu={nestedMenu}
			label="Columns"
			labelType="regular"
		/>
	)
}
