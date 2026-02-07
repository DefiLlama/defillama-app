import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

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
	showMedianApy?: boolean
	showStdDev?: boolean
}

const PREMIUM_KEYS = new Set(['showMedianApy', 'showStdDev'])

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
	{ name: 'Available', key: 'showAvailable' },
	{ name: '30d Median APY \u2726 Pro', key: 'showMedianApy' },
	{ name: '30d Std Dev \u2726 Pro', key: 'showStdDev' }
]

export function ColumnFilters({ nestedMenu, ...props }: IColumnFiltersProps) {
	const router = useRouter()
	const { hasActiveSubscription } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })

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
		showMedianApy: _showMedianApy,
		showStdDev: _showStdDev,
		...queries
	} = router.query

	const { options, selectedOptions } = useMemo(() => {
		const options = optionalFilters.filter((op) => props[op.key])

		const selectedOptions = options.filter((option) => router.query[option.key] === 'true').map((op) => op.key)

		return { options, selectedOptions }
	}, [router.query, props])

	const prevSelectionRef = useRef<Set<string>>(new Set(selectedOptions))

	const setSelectedOptions = (newOptions: string[]) => {
		// Check if a premium column was just toggled on by a non-subscriber
		if (!hasActiveSubscription) {
			const prevSet = prevSelectionRef.current
			const newlyAdded = newOptions.filter((op) => !prevSet.has(op))
			const hasPremiumToggle = newlyAdded.some((op) => PREMIUM_KEYS.has(op))
			if (hasPremiumToggle) {
				setShouldRenderModal(true)
				return
			}
		}

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
		<>
			<SelectWithCombobox
				allValues={options}
				selectedValues={selectedOptions}
				setSelectedValues={setSelectedOptions}
				nestedMenu={nestedMenu}
				label="Columns"
				labelType="regular"
			/>
			{shouldRenderModal ? (
				<Suspense fallback={null}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}
		</>
	)
}
