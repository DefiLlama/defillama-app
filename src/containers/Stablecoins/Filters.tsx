import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { Select } from '~/components/Select/Select'
import { useRangeFilter } from '~/hooks/useRangeFilter'
import {
	resolveSelectedStablecoinFilterKeys,
	stablecoinAttributeOptions,
	stablecoinBackingOptions,
	stablecoinPegTypeOptions
} from './filterPolicy'

const isStablecoinChartQueryKey = (key: string) => key === 'chartType' || key === 'chartView' || key === 'groupBy'

type StablecoinFilterKey = string

function Attribute({ nestedMenu }: { nestedMenu: boolean; pathname?: string }) {
	const router = useRouter()
	const { attribute, excludeAttribute } = router.query

	const selectedValues = useMemo(() => {
		return resolveSelectedStablecoinFilterKeys({
			includeParam: attribute,
			excludeParam: excludeAttribute,
			options: stablecoinAttributeOptions
		})
	}, [attribute, excludeAttribute])

	return (
		<Select
			allValues={stablecoinAttributeOptions}
			selectedValues={selectedValues}
			label="Attribute"
			nestedMenu={nestedMenu}
			labelType="smol"
			variant="filter-responsive"
			includeQueryKey="attribute"
			excludeQueryKey="excludeAttribute"
		/>
	)
}

function BackingType({
	nestedMenu,
	availableBackings
}: {
	nestedMenu: boolean
	pathname?: string
	availableBackings?: StablecoinFilterKey[]
}) {
	const router = useRouter()
	const { backing, excludeBacking } = router.query

	const backingOptions = useMemo(() => {
		if (!availableBackings || availableBackings.length === 0) return stablecoinBackingOptions
		const allowed = new Set(availableBackings)
		return stablecoinBackingOptions.filter((o) => allowed.has(o.key))
	}, [availableBackings])

	const selectedValues = useMemo(() => {
		return resolveSelectedStablecoinFilterKeys({
			includeParam: backing,
			excludeParam: excludeBacking,
			options: backingOptions
		})
	}, [backing, excludeBacking, backingOptions])

	return (
		<Select
			allValues={backingOptions}
			selectedValues={selectedValues}
			label="Backing Type"
			nestedMenu={nestedMenu}
			labelType="smol"
			variant="filter-responsive"
			includeQueryKey="backing"
			excludeQueryKey="excludeBacking"
		/>
	)
}

function PegType({
	nestedMenu,
	availablePegTypes
}: {
	nestedMenu: boolean
	pathname?: string
	availablePegTypes?: StablecoinFilterKey[]
}) {
	const router = useRouter()
	const { pegtype, excludePegtype } = router.query

	const pegTypeOptions = useMemo(() => {
		if (!availablePegTypes || availablePegTypes.length === 0) return stablecoinPegTypeOptions
		const allowed = new Set(availablePegTypes)
		return stablecoinPegTypeOptions.filter((o) => allowed.has(o.key))
	}, [availablePegTypes])

	const selectedValues = useMemo(() => {
		return resolveSelectedStablecoinFilterKeys({
			includeParam: pegtype,
			excludeParam: excludePegtype,
			options: pegTypeOptions
		})
	}, [pegtype, excludePegtype, pegTypeOptions])

	return (
		<Select
			allValues={pegTypeOptions}
			selectedValues={selectedValues}
			label="Peg Type"
			nestedMenu={nestedMenu}
			labelType="smol"
			variant="filter-responsive"
			includeQueryKey="pegtype"
			excludeQueryKey="excludePegtype"
		/>
	)
}

function McapRange({
	nestedMenu,
	placement
}: {
	nestedMenu?: boolean
	placement?: Ariakit.PopoverStoreProps['placement']
}) {
	const { min, max, handleSubmit, handleClear } = useRangeFilter('minMcap', 'maxMcap')

	return (
		<FilterBetweenRange
			name="Mcap"
			trigger={
				<>
					{min || max ? (
						<>
							<span>Mcap: </span>
							<span className="text-(--link)">{`${min?.toLocaleString() ?? 'min'} - ${
								max?.toLocaleString() ?? 'max'
							}`}</span>
						</>
					) : (
						'Mcap'
					)}
				</>
			}
			onSubmit={handleSubmit}
			onClear={handleClear}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			placement={placement}
		/>
	)
}

function ResetAllStablecoinFilters({ pathname }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()

	let hasActiveQueryFilters = false
	const chartQuery: Record<string, string | string[]> = {}
	for (const key in router.query) {
		const value = router.query[key]
		if (key === 'chain' || value === undefined) continue
		if (isStablecoinChartQueryKey(key)) {
			if (Array.isArray(value) ? value.length > 0 : value !== '') chartQuery[key] = value
			continue
		}
		if (Array.isArray(value) ? value.length > 0 : value !== '') hasActiveQueryFilters = true
	}

	return (
		<button
			onClick={() => {
				void router.push({ pathname, query: chartQuery }, undefined, { shallow: true })
			}}
			disabled={!hasActiveQueryFilters}
			className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
		>
			Reset all filters
		</button>
	)
}

function PeggedFiltersDropdowns({
	pathname,
	nestedMenu,
	availableBackings,
	availablePegTypes
}: {
	pathname: string
	nestedMenu?: boolean
	availableBackings?: StablecoinFilterKey[]
	availablePegTypes?: StablecoinFilterKey[]
}) {
	return (
		<>
			<Attribute nestedMenu={!!nestedMenu} />
			<BackingType nestedMenu={!!nestedMenu} availableBackings={availableBackings} />
			<PegType nestedMenu={!!nestedMenu} availablePegTypes={availablePegTypes} />
			<McapRange nestedMenu={nestedMenu} placement="bottom-start" />
			<ResetAllStablecoinFilters pathname={pathname} nestedMenu={!!nestedMenu} />
		</>
	)
}

export function PeggedFilters(props: {
	pathname: string
	availableBackings?: StablecoinFilterKey[]
	availablePegTypes?: StablecoinFilterKey[]
}) {
	return (
		<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<ResponsiveFilterLayout desktopClassName="hidden min-h-[30px] flex-wrap gap-2 sm:flex">
				{(nestedMenu) => <PeggedFiltersDropdowns {...props} nestedMenu={nestedMenu} />}
			</ResponsiveFilterLayout>
		</div>
	)
}
