import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { LockIcon } from '~/components/LockIcon'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

interface IColumnFiltersProps {
	nestedMenu?: boolean
	enabledColumns?: string[]
}

const PREMIUM_KEYS = new Set(['showMedianApy', 'showStdDev'])

const PRO_BADGE = (
	<span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500 dark:text-blue-400">
		<LockIcon className="h-2.5 w-2.5" />
		Pro
	</span>
)

const baseFilters = [
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
	{ name: '30d Median APY', key: 'showMedianApy', isPremium: true },
	{ name: '30d Std Dev', key: 'showStdDev', isPremium: true }
]

const getOptionalFilters = (hasActiveSubscription: boolean) =>
	baseFilters.map((filter) => ({
		...filter,
		icon: filter.isPremium && !hasActiveSubscription ? PRO_BADGE : undefined
	}))

const ALL_COLUMN_KEYS = baseFilters.map((op) => op.key)

export function ColumnFilters({ nestedMenu, enabledColumns }: IColumnFiltersProps) {
	const router = useRouter()
	const { hasActiveSubscription } = useAuthContext()
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })

	const enabledSet = useMemo(() => new Set(enabledColumns), [enabledColumns])

	const queries = useMemo(() => {
		const q = { ...router.query }
		for (const key of ALL_COLUMN_KEYS) {
			delete q[key]
		}
		return q
	}, [router.query])

	const { options, selectedOptions } = useMemo(() => {
		const optionalFilters = getOptionalFilters(hasActiveSubscription)
		const options = optionalFilters.filter((op) => enabledSet.has(op.key))

		const selectedOptions = options.flatMap((option) => (router.query[option.key] === 'true' ? [option.key] : []))

		return { options, selectedOptions }
	}, [router.query, enabledSet, hasActiveSubscription])

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
		for (const column of newOptions) {
			if (!prevSet.has(column)) {
				trackYieldsEvent(YIELDS_EVENTS.FILTER_COLUMN, { column })
			}
		}
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
