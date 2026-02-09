import * as Ariakit from '@ariakit/react'
import Router, { useRouter } from 'next/router'
import * as React from 'react'
import { useMemo } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { NestedMenu } from '~/components/NestedMenu'
import { Select } from '~/components/Select/Select'
import { useIsClient } from '~/hooks/useIsClient'
import { useMedia } from '~/hooks/useMedia'

export const stablecoinAttributeOptions = [
	{
		name: 'Stable',
		key: 'STABLE',
		filterFn: (item) => typeof item?.pegDeviation === 'number' && Math.abs(item.pegDeviation) <= 10,
		help: 'Show stablecoins within 10% of peg'
	},
	{
		name: 'Yield Bearing',
		key: 'YIELDBEARING',
		filterFn: (item) => !!item?.yieldBearing,
		help: 'Show yield-bearing stablecoins'
	},
	{
		name: 'Unknown',
		key: 'UNKNOWN',
		filterFn: (item) => typeof item?.pegDeviation !== 'number',
		help: 'Show stablecoins with no deviation data'
	},
	{
		name: 'Depegged',
		key: 'DEPEGGED',
		// Yield-bearing assets intentionally render '-' for peg deviation columns,
		// so exclude them from the "Depegged" filter to avoid showing "no peg data" rows.
		filterFn: (item) =>
			!item?.yieldBearing &&
			typeof item?.pegDeviation === 'number' &&
			Number.isFinite(item.pegDeviation) &&
			Math.abs(item.pegDeviation) > 10,
		help: 'Show stablecoins depegged by more than 10%'
	}
]

export const stablecoinBackingOptions = [
	{
		name: 'Fiat',
		key: 'FIATSTABLES',
		filterFn: (item) => item.pegMechanism === 'fiat-backed',
		help: 'Show stablecoins backed by fiat'
	},
	{
		name: 'Crypto',
		key: 'CRYPTOSTABLES',
		filterFn: (item) => item.pegMechanism === 'crypto-backed',
		help: 'Show stablecoins backed by crypto'
	},
	{
		name: 'Algorithmic',
		key: 'ALGOSTABLES',
		filterFn: (item) => item.pegMechanism === 'algorithmic',
		help: 'Show algorithmic stablecoins'
	}
]

export const stablecoinPegTypeOptions = [
	{
		name: 'USD',
		key: 'PEGGEDUSD',
		filterFn: (item) => item.pegType === 'peggedUSD',
		help: 'Show stablecoins pegged to USD'
	},
	{
		name: 'EUR',
		key: 'PEGGEDEUR',
		filterFn: (item) => item.pegType === 'peggedEUR',
		help: 'Show stablecoins pegged to EUR'
	},
	{
		name: 'SGD',
		key: 'PEGGEDSGD',
		filterFn: (item) => item.pegType === 'peggedSGD',
		help: 'Show stablecoins pegged to SGD'
	},
	{
		name: 'JPY',
		key: 'PEGGEDJPY',
		filterFn: (item) => item.pegType === 'peggedJPY',
		help: 'Show stablecoins pegged to JPY'
	},
	{
		name: 'CNY',
		key: 'PEGGEDCNY',
		filterFn: (item) => item.pegType === 'peggedCNY',
		help: 'Show stablecoins pegged to CNY'
	},
	{
		name: 'UAH',
		key: 'PEGGEDUAH',
		filterFn: (item) => item.pegType === 'peggedUAH',
		help: 'Show stablecoins pegged to UAH'
	},
	{
		name: 'ARS',
		key: 'PEGGEDARS',
		filterFn: (item) => item.pegType === 'peggedARS',
		help: 'Show stablecoins pegged to ARS'
	},
	{
		name: 'GBP',
		key: 'PEGGEDGBP',
		filterFn: (item) => item.pegType === 'peggedGBP',
		help: 'Show stablecoins pegged to GBP'
	},
	{
		name: 'Variable',
		key: 'PEGGEDVAR',
		filterFn: (item) => item.pegType === 'peggedVAR',
		help: 'Show stablecoins with a variable or floating peg'
	},
	{
		name: 'CAD',
		key: 'PEGGEDCAD',
		filterFn: (item) => item.pegType === 'peggedCAD',
		help: 'Show stablecoins pegged to CAD'
	},
	{
		name: 'AUD',
		key: 'PEGGEDAUD',
		filterFn: (item) => item.pegType === 'peggedAUD',
		help: 'Show stablecoins pegged to AUD'
	},
	{
		name: 'TRY',
		key: 'PEGGEDTRY',
		filterFn: (item) => item.pegType === 'peggedTRY',
		help: 'Show stablecoins pegged to Turkish Lira'
	},
	{
		name: 'CHF',
		key: 'PEGGEDCHF',
		filterFn: (item) => item.pegType === 'peggedCHF',
		help: 'Show stablecoins pegged to Swiss Franc'
	},
	{
		name: 'COP',
		key: 'PEGGEDCOP',
		filterFn: (item) => item.pegType === 'peggedCOP',
		help: 'Show stablecoins pegged to Colombian Peso'
	},
	{
		name: 'REAL',
		key: 'PEGGEDREAL',
		filterFn: (item) => item.pegType === 'peggedREAL',
		help: 'Show stablecoins pegged to Brazilian Real'
	},
	{
		name: 'RUB',
		key: 'PEGGEDRUB',
		filterFn: (item) => item.pegType === 'peggedRUB',
		help: 'Show stablecoins pegged to Russian Ruble'
	},
	{
		name: 'PHP',
		key: 'PEGGEDPHP',
		filterFn: (item) => item.pegType === 'peggedPHP',
		help: 'Show stablecoins pegged to Philippine Peso'
	},
	{
		name: 'MXN',
		key: 'PEGGEDMXN',
		filterFn: (item) => item.pegType === 'peggedMXN',
		help: 'Show stablecoins pegged to Mexican Peso'
	}
]

type StablecoinFilterKey = string

// Helper to parse exclude query param to Set
const parseExcludeParam = (param: string | string[] | undefined): Set<string> => {
	if (!param) return new Set()
	if (typeof param === 'string') return new Set([param])
	return new Set(param)
}

// Helper to parse include param ("None" sentinel supported) to array
const parseIncludeParam = (param: string | string[] | undefined, allKeys: string[]): string[] => {
	if (!param) return allKeys
	if (typeof param === 'string') return param === 'None' ? [] : [param]
	return [...param]
}

function Attribute({ nestedMenu }: { nestedMenu: boolean; pathname?: string }) {
	const router = useRouter()
	const { attribute, excludeAttribute } = router.query

	const selectedValues = useMemo(() => {
		const attributeKeyByLower = new Map(stablecoinAttributeOptions.map((o) => [String(o.key).toLowerCase(), o.key]))
		const normalizeAttributeKey = (raw: string) => {
			const lower = raw.toLowerCase()
			if (lower === 'deppeged') return attributeKeyByLower.get('depegged')
			if (lower === 'unknow') return attributeKeyByLower.get('unknown')
			return attributeKeyByLower.get(lower)
		}

		const allKeys = stablecoinAttributeOptions.map((o) => o.key)

		const includeRaw = parseIncludeParam(attribute as any, allKeys)
		const includeNormalized = includeRaw.flatMap((a) => {
			const key = normalizeAttributeKey(a)
			return key ? [key] : []
		})

		const excludeSetRaw = parseExcludeParam(excludeAttribute as any)
		const excludeSetNormalized = new Set(
			Array.from(excludeSetRaw).flatMap((a) => {
				const key = normalizeAttributeKey(a)
				return key ? [key] : []
			})
		)

		const selected = includeNormalized.filter((a) => !excludeSetNormalized.has(a))
		return Array.from(new Set(selected))
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
		const allKeys = backingOptions.map((o) => o.key)
		const include = parseIncludeParam(backing as any, allKeys)
		const excludeSet = parseExcludeParam(excludeBacking as any)
		return include.filter((k) => !excludeSet.has(k))
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
		const allKeys = pegTypeOptions.map((o) => o.key)
		const include = parseIncludeParam(pegtype as any, allKeys)
		const excludeSet = parseExcludeParam(excludePegtype as any)
		return include.filter((k) => !excludeSet.has(k))
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
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minMcap = form.min?.value
		const maxMcap = form.max?.value

		const params = new URLSearchParams(window.location.search)
		if (minMcap) params.set('minMcap', minMcap)
		else params.delete('minMcap')
		if (maxMcap) params.set('maxMcap', maxMcap)
		else params.delete('maxMcap')
		Router.push(`${window.location.pathname}?${params.toString()}`, undefined, { shallow: true })
	}

	const handleClear = () => {
		const params = new URLSearchParams(window.location.search)
		params.delete('minMcap')
		params.delete('maxMcap')
		const queryString = params.toString()
		const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
		Router.push(newUrl, undefined, { shallow: true })
	}

	const { minMcap, maxMcap } = router.query
	const min = typeof minMcap === 'string' && minMcap !== '' ? Number(minMcap) : null
	const max = typeof maxMcap === 'string' && maxMcap !== '' ? Number(maxMcap) : null

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

	// Only reset URL-driven filters (stablecoin filters are currently driven by query params)
	const hasActiveQueryFilters = Object.entries(router.query).some(([key, value]) => {
		if (key === 'chain') return false
		if (value === undefined) return false
		if (Array.isArray(value)) return value.length > 0
		return value !== ''
	})

	return (
		<button
			onClick={() => {
				router.push(pathname, undefined, { shallow: true })
			}}
			disabled={!hasActiveQueryFilters}
			className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
		>
			Reset all filters
		</button>
	)
}

export function PeggedFiltersDropdowns({
	pathname,
	nestedMenu,
	prepareCsv,
	availableBackings,
	availablePegTypes
}: {
	pathname: string
	nestedMenu?: boolean
	prepareCsv: () => { filename: string; rows: Array<Array<string | number | boolean>> }
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
			<CSVDownloadButton prepareCsv={prepareCsv} smol className="ml-auto" />
		</>
	)
}

export function PeggedFilters(props: {
	pathname: string
	prepareCsv: () => { filename: string; rows: Array<Array<string | number | boolean>> }
	availableBackings?: StablecoinFilterKey[]
	availablePegTypes?: StablecoinFilterKey[]
}) {
	const isSmall = useMedia(`(max-width: 639px)`)
	const isClient = useIsClient()
	return (
		<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<div className="flex min-h-[30px] flex-wrap gap-2 *:flex-1 sm:hidden">
				{isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<NestedMenu label="Filters" className="w-full">
							<PeggedFiltersDropdowns {...props} nestedMenu />
						</NestedMenu>
					</React.Suspense>
				) : null}
			</div>
			<div className="hidden min-h-[30px] flex-wrap gap-2 sm:flex">
				{!isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<PeggedFiltersDropdowns {...props} />
					</React.Suspense>
				) : null}
			</div>
		</div>
	)
}
