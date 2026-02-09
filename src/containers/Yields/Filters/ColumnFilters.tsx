import { useRouter } from 'next/router'
import { useMemo, useRef } from 'react'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

interface IColumnFiltersProps {
	nestedMenu?: boolean
	enabledColumns?: string[]
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

const ALL_COLUMN_KEYS = optionalFilters.map((op) => op.key)

export function ColumnFilters({ nestedMenu, enabledColumns }: IColumnFiltersProps) {
	const router = useRouter()

	const enabledSet = useMemo(() => new Set(enabledColumns), [enabledColumns])

	const queries = useMemo(() => {
		const q = { ...router.query }
		for (const key of ALL_COLUMN_KEYS) {
			delete q[key]
		}
		return q
	}, [router.query])

	const { options, selectedOptions } = useMemo(() => {
		const options = optionalFilters.filter((op) => enabledSet.has(op.key))

		const selectedOptions = options.flatMap((option) => (router.query[option.key] === 'true' ? [option.key] : []))

		return { options, selectedOptions }
	}, [router.query, enabledSet])

	const prevSelectionRef = useRef<Set<string>>(new Set(selectedOptions))

	const setSelectedOptions = (newOptions: string[]) => {
		const optionsObj: Record<string, boolean> = {}
		for (const op of newOptions) {
			optionsObj[op] = true
		}

		const prevSet = prevSelectionRef.current
		newOptions.forEach((column) => {
			if (!prevSet.has(column)) {
				trackYieldsEvent(YIELDS_EVENTS.FILTER_COLUMN, { column })
			}
		})
		prevSelectionRef.current = new Set(newOptions)

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
