import {
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { matchSorter } from 'match-sorter'
import Link from 'next/link'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import type { ProtocolLite, ParentProtocolLite } from '~/containers/Protocols/api.types'
import type { IRawTokenRightsEntry } from '~/containers/TokenRights/api.types'
import Layout from '~/layout'
import { isDatasetCacheEnabled } from '~/server/datasetCache/config'
import { formattedNum, slug } from '~/utils'
import { tokenIconUrl } from '~/utils/icons'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { ICexItem, IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'
import { flushTelemetry, recordDomainEvent } from '~/utils/telemetry'
import {
	findTokenDirectoryRecordByDefillamaId,
	findTokenDirectoryRecordByGeckoId,
	type TokenDirectory
} from '~/utils/tokenDirectory'

interface TokenRightsListItem {
	name: string
	logo: string
	href: string | null
	tokens: string[]
	holdersRevenue24h: number | null
	governanceRights: [boolean, boolean, boolean]
	economicRights: [boolean, boolean, boolean]
	feeSwitchStatus: TokenRightsFeeSwitchStatus
	feeSwitchDetails: string | null
	valueAccrual: string | null
	valueAccrualDetails: string | null
	equityRevenueCapture: string | null
	equityRevenueCaptureDetails: string | null
	lastUpdated: string | null
	hasBuybacks: boolean
	hasDividends: boolean
	hasBurns: boolean
	hasEquityCapture: boolean
	hasNoEquityCapture: boolean
}

type TokenRightsFeeSwitchStatus = 'ON' | 'OFF' | 'PENDING' | 'UNKNOWN'

type TokenRightsFilter =
	| 'feeSwitchOn'
	| 'hasBuybacks'
	| 'hasDividends'
	| 'hasBurns'
	| 'noEquityCapture'
	| 'equityCapture'

type TokenRightsMetadataMatch =
	| { source: 'chain'; metadata: IChainMetadata }
	| { source: 'protocol'; metadata: IProtocolMetadata }
	| { source: 'cex'; metadata: ICexItem }

type SkippedTokenRightsEntry = {
	defillamaId: string | null
	reason: 'missing_defillama_id' | 'missing_metadata' | 'missing_display_name' | 'missing_gecko_id'
	metadataSource?: TokenRightsMetadataMatch['source']
	geckoId?: string
}

type TokenRightsLinkResolution =
	| { type: 'linked'; item: TokenRightsListItem }
	| { type: 'skipped'; entry: SkippedTokenRightsEntry }

const columnHelper = createColumnHelper<TokenRightsListItem>()

const TOKEN_RIGHTS_PILL_TOOLTIPS = {
	feeSwitch:
		'Whether the protocol has activated a mechanism to direct a share of fees to token holders through buybacks, revenue sharing or token burns. Status can be ON, OFF or PENDING.',
	valueAccrual: 'The main mechanism by which value accrues to token holders',
	equityRevenueCapture:
		'Whether any equity entity (Labs, parent company) captures protocol revenue separately from token holders. Active means equity holders receive revenue that could otherwise flow to token holders.'
} as const

const TOKEN_RIGHTS_FILTERS: Array<{ key: TokenRightsFilter; label: string }> = [
	{ key: 'feeSwitchOn', label: 'Fee Switch ON' },
	{ key: 'hasBuybacks', label: 'Has Buybacks' },
	{ key: 'hasDividends', label: 'Has Dividends' },
	{ key: 'hasBurns', label: 'Has Burns' },
	{ key: 'noEquityCapture', label: 'No Equity Capture' },
	{ key: 'equityCapture', label: 'Equity Capture' }
]

export const getStaticProps = withPerformanceLogging('token-rights', async () => {
	const metadataModule = await import('~/utils/metadata')
	const holdersRevenue = await import('~/containers/DimensionAdapters/api')
		.then((m) =>
			m.fetchAdapterChainMetrics({
				adapterType: ADAPTER_TYPES.FEES,
				chain: 'All',
				dataType: ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE
			})
		)
		.catch(() => null)
	const shouldUseDatasetCache = isDatasetCacheEnabled()
	const entries = shouldUseDatasetCache
		? await (async () => {
				const { fetchTokenRightsEntriesFromCache } = await import('~/server/datasetCache/tokenRights')
				return fetchTokenRightsEntriesFromCache()
			})()
		: await import('~/containers/TokenRights/api').then((m) => m.fetchTokenRightsData())

	const { chainMetadata, protocolMetadata, tokenDirectory, cexs } = metadataModule.default as {
		chainMetadata: Record<string, IChainMetadata>
		protocolMetadata: Record<string, IProtocolMetadata>
		tokenDirectory: TokenDirectory
		cexs: ICexItem[]
	}
	const { protocols: liteProtocols, parentProtocols } = await import('~/containers/Protocols/api')
		.then((m) => m.fetchProtocols())
		.catch(() => ({ protocols: [], parentProtocols: [] }))
	const holdersRevenueByDefillamaId = buildHoldersRevenueByDefillamaId(
		holdersRevenue?.protocols ?? [],
		liteProtocols,
		parentProtocols
	)

	const protocols: TokenRightsListItem[] = []
	const skippedEntries: SkippedTokenRightsEntry[] = []

	for (const entry of entries) {
		const resolved = resolveTokenRightsListItem(entry, {
			chainMetadata,
			protocolMetadata,
			tokenDirectory,
			cexs,
			holdersRevenueByDefillamaId
		})

		if (resolved.type === 'linked') {
			protocols.push(resolved.item)
		} else {
			skippedEntries.push(resolved.entry)
		}
	}

	protocols.sort((a, b) => a.name.localeCompare(b.name))
	reportSkippedTokenRightsEntries(skippedEntries)
	if (skippedEntries.length > 0) {
		await flushTelemetry({ timeoutMs: 2000, runtime: 'build' })
	}

	return {
		props: { protocols },
		revalidate: maxAgeForNext([22])
	}
})

function resolveTokenRightsListItem(
	entry: IRawTokenRightsEntry,
	{
		chainMetadata,
		protocolMetadata,
		tokenDirectory,
		cexs,
		holdersRevenueByDefillamaId
	}: {
		chainMetadata: Record<string, IChainMetadata>
		protocolMetadata: Record<string, IProtocolMetadata>
		tokenDirectory: TokenDirectory
		cexs: ICexItem[]
		holdersRevenueByDefillamaId: Record<string, number>
	}
): TokenRightsLinkResolution {
	const defillamaId = entry['DefiLlama ID']?.trim() || null
	const protocolName = entry['Protocol Name'].trim()
	const baseSkippedEntry = { defillamaId }

	if (!defillamaId) {
		return { type: 'skipped', entry: { ...baseSkippedEntry, reason: 'missing_defillama_id' } }
	}

	const metadataMatch = findTokenRightsMetadata(defillamaId, protocolName, chainMetadata, protocolMetadata, cexs)
	if (!metadataMatch) {
		return { type: 'skipped', entry: { ...baseSkippedEntry, reason: 'missing_metadata' } }
	}

	const name = getMetadataDisplayName(metadataMatch)
	if (!name) {
		return {
			type: 'skipped',
			entry: {
				...baseSkippedEntry,
				reason: 'missing_display_name',
				metadataSource: metadataMatch.source
			}
		}
	}

	const geckoId = metadataMatch.source === 'cex' ? metadataMatch.metadata.cgId : metadataMatch.metadata.gecko_id
	let tokenRecord = findTokenDirectoryRecordByDefillamaId(tokenDirectory, defillamaId)

	if (!tokenRecord && metadataMatch.source === 'cex') {
		const cexSlug = slug(protocolName)

		for (const key in tokenDirectory) {
			const token = tokenDirectory[key]

			if (slug(token.name) === cexSlug) {
				tokenRecord = token
				break
			}
		}
	}

	if (!tokenRecord && !geckoId) {
		return {
			type: 'skipped',
			entry: {
				...baseSkippedEntry,
				reason: 'missing_gecko_id',
				metadataSource: metadataMatch.source
			}
		}
	}

	if (!tokenRecord) {
		tokenRecord = findTokenDirectoryRecordByGeckoId(tokenDirectory, geckoId)
	}

	if (!tokenRecord) {
		return { type: 'linked', item: buildTokenRightsListItem({ entry, name, href: null, holdersRevenueByDefillamaId }) }
	}

	return {
		type: 'linked',
		item: buildTokenRightsListItem({
			entry,
			name,
			logo: tokenRecord.logo ?? tokenIconUrl(name),
			href: tokenRecord.route ?? null,
			holdersRevenueByDefillamaId
		})
	}
}

function buildTokenRightsListItem({
	entry,
	name,
	logo,
	href,
	holdersRevenueByDefillamaId
}: {
	entry: IRawTokenRightsEntry
	name: string
	logo?: string
	href: string | null
	holdersRevenueByDefillamaId: Record<string, number>
}): TokenRightsListItem {
	const hasBuybacks = hasActiveTokens(entry.Buybacks)
	const hasDividends = hasActiveTokens(entry.Dividends)
	const hasBurns = isActiveText(entry.Burns)
	const equityRevenueCapture = trimToNull(entry['Equity Revenue Capture'])

	return {
		name,
		logo: logo ?? tokenIconUrl(name),
		href,
		tokens: entry.Token ?? [],
		holdersRevenue24h: holdersRevenueByDefillamaId[entry['DefiLlama ID']] ?? null,
		governanceRights: [
			hasActiveTokens(entry['Governance Decisions']),
			hasActiveTokens(entry['Treasury Decisions']),
			hasActiveTokens(entry['Revenue Decisions'])
		],
		economicRights: [hasBuybacks, hasDividends, hasBurns],
		feeSwitchStatus: toFeeSwitchStatus(entry['Fee Switch Status']),
		feeSwitchDetails: trimToNull(entry['Fee Switch Details']),
		valueAccrual: trimToNull(entry['Value Accrual']),
		valueAccrualDetails: trimToNull(entry['Value Accrual Details']),
		equityRevenueCapture,
		equityRevenueCaptureDetails: trimToNull(entry['Equity Statement']),
		lastUpdated: trimToNull(entry['Last Updated']),
		hasBuybacks,
		hasDividends,
		hasBurns,
		hasEquityCapture: equityRevenueCapture === 'Yes' || equityRevenueCapture === 'Partial',
		hasNoEquityCapture: equityRevenueCapture === 'No'
	}
}

function buildHoldersRevenueByDefillamaId(
	holdersRevenueProtocols: Array<{ defillamaId: string; total24h: number | null }>,
	liteProtocols: ProtocolLite[],
	parentProtocols: ParentProtocolLite[]
): Record<string, number> {
	const holdersRevenueByDefillamaId: Record<string, number> = {}
	const holdersRevenueByParentId: Record<string, number> = {}
	const liteProtocolByDefillamaId: Record<string, ProtocolLite> = {}
	const knownParentIds: Record<string, true> = {}

	for (const parent of parentProtocols) {
		knownParentIds[parent.id] = true
	}

	for (const protocol of liteProtocols) {
		liteProtocolByDefillamaId[protocol.defillamaId] = protocol
	}

	for (const protocol of holdersRevenueProtocols) {
		if (protocol.total24h == null) continue

		holdersRevenueByDefillamaId[protocol.defillamaId] = protocol.total24h

		const liteProtocol = liteProtocolByDefillamaId[protocol.defillamaId]
		if (liteProtocol?.parentProtocol) {
			holdersRevenueByParentId[liteProtocol.parentProtocol] =
				(holdersRevenueByParentId[liteProtocol.parentProtocol] ?? 0) + protocol.total24h
		}
	}

	for (const parentId in holdersRevenueByParentId) {
		if (holdersRevenueByDefillamaId[parentId] == null && knownParentIds[parentId]) {
			holdersRevenueByDefillamaId[parentId] = holdersRevenueByParentId[parentId]
		}
	}

	return holdersRevenueByDefillamaId
}

function trimToNull(value: string | undefined | null): string | null {
	const trimmed = value?.trim()
	return trimmed ? trimmed : null
}

function isInactiveValue(value: string): boolean {
	const normalized = value.trim().toLowerCase()
	return (
		normalized === '' ||
		normalized === 'n/a' ||
		normalized === 'na' ||
		normalized === 'none' ||
		normalized === 'unknown'
	)
}

function hasActiveTokens(tokens: string[] | undefined | null): boolean {
	if (!tokens || tokens.length === 0) return false

	for (const token of tokens) {
		if (!isInactiveValue(token)) return true
	}

	return false
}

function isActiveText(value: string | undefined | null): boolean {
	return value ? !isInactiveValue(value) : false
}

function toFeeSwitchStatus(value: string | undefined | null): TokenRightsFeeSwitchStatus {
	const normalized = value?.trim().toUpperCase()
	if (normalized === 'ON' || normalized === 'OFF' || normalized === 'PENDING') return normalized
	return 'UNKNOWN'
}

function findTokenRightsMetadata(
	defillamaId: string,
	name: string,
	chainMetadata: Record<string, IChainMetadata>,
	protocolMetadata: Record<string, IProtocolMetadata>,
	cexs: ICexItem[]
): TokenRightsMetadataMatch | null {
	const chain = chainMetadata[defillamaId]
	if (chain) return { source: 'chain', metadata: chain }

	for (const key in chainMetadata) {
		const cachedChain = chainMetadata[key]
		if (cachedChain.id === defillamaId) return { source: 'chain', metadata: cachedChain }
	}

	const protocol = protocolMetadata[defillamaId]
	if (protocol) return { source: 'protocol', metadata: protocol }

	const cexSlug = slug(name)
	for (const cex of cexs) {
		if (cex.slug && slug(cex.slug) === cexSlug) return { source: 'cex', metadata: cex }
	}

	return null
}

function getMetadataDisplayName(metadataMatch: TokenRightsMetadataMatch): string | null {
	if (metadataMatch.source === 'chain') {
		const chain = metadataMatch.metadata as IChainMetadata & { displayName?: string }
		return chain.displayName ?? chain.name ?? null
	}

	if (metadataMatch.source === 'protocol') {
		return metadataMatch.metadata.displayName ?? metadataMatch.metadata.name ?? null
	}

	return metadataMatch.metadata.name ?? null
}

function reportSkippedTokenRightsEntries(skippedEntries: SkippedTokenRightsEntry[]): void {
	if (skippedEntries.length === 0) return

	recordDomainEvent(
		'token_rights.alert',
		'warn',
		'token-rights',
		'Skipped token rights entries while building token-rights page',
		{
			skipped_count: skippedEntries.length,
			reason_counts: countSkippedTokenRightsReasons(skippedEntries),
			skipped_entries: skippedEntries
		}
	)
}

function countSkippedTokenRightsReasons(skippedEntries: SkippedTokenRightsEntry[]): Record<string, number> {
	const counts: Record<string, number> = {}
	for (const entry of skippedEntries) {
		counts[entry.reason] = (counts[entry.reason] ?? 0) + 1
	}
	return counts
}

function TokenRightsPage({ protocols }: { protocols: TokenRightsListItem[] }) {
	const [activeFilters, setActiveFilters] = useState<TokenRightsFilter[]>([])
	const [searchValue, setSearchValue] = useState('')
	const [sorting, setSorting] = useState<SortingState>([])
	const deferredSearchValue = useDeferredValue(searchValue)

	const filteredProtocols = useMemo(
		() => filterTokenRightsRows(protocols, activeFilters, deferredSearchValue),
		[protocols, activeFilters, deferredSearchValue]
	)
	const stats = useMemo(() => getTokenRightsStats(filteredProtocols), [filteredProtocols])
	const latestUpdated = useMemo(() => getLatestUpdatedMonth(protocols), [protocols])
	const table = useReactTable({
		data: filteredProtocols,
		columns,
		state: { sorting },
		defaultColumn: { sortUndefined: 'last' },
		enableSortingRemoval: true,
		onSortingChange: (updater) => startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	const toggleFilter = (filter: TokenRightsFilter) => {
		startTransition(() => {
			setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((item) => item !== filter) : [...prev, filter]))
		})
	}

	return (
		<Layout
			title="DeFi Token Rights by Project - DefiLlama"
			description="Explore token holder rights across DeFi protocols — governance, economic rights, value accrual, and alignment."
			canonicalUrl="/token-rights"
		>
			<div className="flex flex-col gap-2">
				<header className="flex min-h-[72px] w-full flex-col justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
					<h1 className="text-xl font-semibold">Token Rights</h1>
					<p className="mt-1 text-sm text-(--text-secondary)">
						Compare governance, economic, and ownership rights across {protocols.length} DeFi protocols
					</p>
				</header>

				<div className="flex min-h-[46px] w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
					<InlineStat value={filteredProtocols.length} label="Protocols" />
					<InlineStat value={stats.feeSwitchOn} label="Fee Switch ON" />
					<InlineStat value={stats.buybacks} label="Active Buybacks" />
					<InlineStat value={stats.dividends} label="Dividends" />
				</div>

				<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<div className="flex flex-wrap items-center gap-2">
						<span className="mr-2 text-xs font-semibold tracking-widest text-(--text-label) uppercase">Filters</span>
						{TOKEN_RIGHTS_FILTERS.map((filter) => (
							<button
								key={filter.key}
								type="button"
								onClick={() => toggleFilter(filter.key)}
								data-active={activeFilters.includes(filter.key)}
								className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-1.5 text-sm text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) data-[active=true]:border-(--link-text) data-[active=true]:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
							>
								{filter.label}
							</button>
						))}
						<label className="relative ml-auto w-full max-w-full sm:max-w-[280px]">
							<span className="sr-only">Search protocol</span>
							<Icon
								name="search"
								height={16}
								width={16}
								className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
							/>
							<input
								onInput={(event) => {
									setSearchValue(event.currentTarget.value)
								}}
								placeholder="Search protocol..."
								className="w-full rounded-md border border-(--form-control-border) bg-(--app-bg) p-1.5 pl-7 text-sm text-(--text-primary) placeholder:text-(--text-tertiary)"
							/>
						</label>
					</div>

					<div className="overflow-hidden rounded-md border border-(--cards-border)">
						<VirtualTable instance={table} rowSize={58} skipVirtualization />
						{filteredProtocols.length === 0 ? (
							<div className="flex min-h-[180px] items-center justify-center border-t border-(--divider) px-4 text-center text-sm text-(--text-secondary)">
								No protocols found for these filters
							</div>
						) : null}
					</div>

					<TokenRightsLegend />

					<footer className="flex flex-wrap items-center justify-between gap-2 border-t border-(--cards-border) pt-4 text-sm text-(--text-secondary)">
						<span>
							{latestUpdated ? `Last updated: ${latestUpdated} - ` : null}
							{filteredProtocols.length} protocols shown
						</span>
					</footer>
				</div>
			</div>
		</Layout>
	)
}

export function filterTokenRightsRows(
	protocols: TokenRightsListItem[],
	activeFilters: TokenRightsFilter[],
	searchValue: string
): TokenRightsListItem[] {
	const normalizedSearch = searchValue.trim()
	const source = normalizedSearch
		? matchSorter(protocols, normalizedSearch, {
				keys: ['name', (protocol) => protocol.tokens],
				threshold: matchSorter.rankings.CONTAINS
			})
		: protocols
	const filtered: TokenRightsListItem[] = []

	for (const protocol of source) {
		let matchesFilters = true
		for (const filter of activeFilters) {
			if (
				(filter === 'feeSwitchOn' && protocol.feeSwitchStatus !== 'ON') ||
				(filter === 'hasBuybacks' && !protocol.hasBuybacks) ||
				(filter === 'hasDividends' && !protocol.hasDividends) ||
				(filter === 'hasBurns' && !protocol.hasBurns) ||
				(filter === 'noEquityCapture' && !protocol.hasNoEquityCapture) ||
				(filter === 'equityCapture' && !protocol.hasEquityCapture)
			) {
				matchesFilters = false
				break
			}
		}

		if (matchesFilters) filtered.push(protocol)
	}

	return filtered
}

export function getTokenRightsStats(protocols: TokenRightsListItem[]) {
	let feeSwitchOn = 0
	let buybacks = 0
	let dividends = 0

	for (const protocol of protocols) {
		if (protocol.feeSwitchStatus === 'ON') feeSwitchOn++
		if (protocol.hasBuybacks) buybacks++
		if (protocol.hasDividends) dividends++
	}

	return { feeSwitchOn, buybacks, dividends }
}

function getLatestUpdatedMonth(protocols: TokenRightsListItem[]): string | null {
	let latestTime = 0

	for (const protocol of protocols) {
		if (!protocol.lastUpdated) continue
		const time = new Date(protocol.lastUpdated).getTime()
		if (time > latestTime) latestTime = time
	}

	return latestTime
		? new Date(latestTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
		: null
}

const columns = [
	columnHelper.accessor('name', {
		header: 'Protocol',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const name = getValue()
			const href = row.original.href
			const nameClassName =
				'overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline'

			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo src={row.original.logo} data-lgonly alt={`Logo of ${name}`} />
					{href ? (
						<Link href={href} className={nameClassName}>
							{name}
						</Link>
					) : (
						<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--text-primary)">
							{name}
						</span>
					)}
				</span>
			)
		},
		meta: { headerClassName: 'w-[min(220px,40vw)]' }
	}),
	columnHelper.accessor('tokens', {
		header: 'Token',
		enableSorting: false,
		cell: ({ getValue }) => <TokenPills tokens={getValue()} />,
		meta: { headerClassName: 'w-[280px]' }
	}),
	columnHelper.accessor('holdersRevenue24h', {
		header: 'Holders Rev 24h',
		enableSorting: true,
		cell: ({ getValue }) => {
			const value = getValue()
			return value == null ? <span className="text-(--text-tertiary)">-</span> : formattedNum(value, true)
		},
		meta: {
			headerClassName: 'w-[150px]',
			align: 'end',
			headerHelperText: 'Revenue distributed to token holders over the last 24 hours'
		}
	}),
	columnHelper.accessor('governanceRights', {
		header: 'Governance',
		enableSorting: false,
		cell: ({ getValue }) => (
			<RightsDots rights={getValue()} labels={['Governance decisions', 'Treasury decisions', 'Revenue decisions']} />
		),
		meta: {
			headerClassName: 'w-[130px]',
			align: 'center',
			headerHelperText: 'Dots show whether token holders have governance, treasury, and revenue decision rights'
		}
	}),
	columnHelper.accessor('economicRights', {
		header: 'Economic Rights',
		enableSorting: false,
		cell: ({ getValue }) => <RightsDots rights={getValue()} labels={['Buybacks', 'Dividends', 'Burns']} />,
		meta: {
			headerClassName: 'w-[150px]',
			align: 'center',
			headerHelperText: 'Dots show whether the token has buybacks, dividends, and burns'
		}
	}),
	columnHelper.accessor('feeSwitchStatus', {
		header: 'Fee Switch',
		enableSorting: false,
		cell: ({ getValue, row }) => <FeeSwitchBadge status={getValue()} details={row.original.feeSwitchDetails} />,
		meta: {
			headerClassName: 'w-[120px]',
			align: 'center',
			headerHelperText: 'Whether protocol fees are currently routed to token holders'
		}
	}),
	columnHelper.accessor('valueAccrual', {
		header: 'Value Accrual',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()
			return value && value !== 'N/A' ? (
				<TooltipStatusPill
					label={value}
					tone="positive"
					tooltip={row.original.valueAccrualDetails ?? TOKEN_RIGHTS_PILL_TOOLTIPS.valueAccrual}
					className="whitespace-nowrap"
				/>
			) : (
				<span className="text-(--text-tertiary)">-</span>
			)
		},
		meta: {
			headerClassName: 'w-[260px]',
			headerHelperText: 'Mechanism by which token holders may benefit economically, such as buybacks or revenue share'
		}
	}),
	columnHelper.accessor('equityRevenueCapture', {
		header: 'Equity Revenue Capture',
		enableSorting: false,
		cell: ({ getValue, row }) => (
			<EquityCaptureBadge value={getValue()} details={row.original.equityRevenueCaptureDetails} />
		),
		meta: {
			headerClassName: 'w-[190px]',
			align: 'center',
			headerHelperText: 'Whether token holders have exposure to protocol or company revenue similar to equity'
		}
	})
]

function InlineStat({ value, label }: { value: number; label: string }) {
	return (
		<div className="flex items-baseline gap-1.5">
			<span className="text-sm text-(--text-label)">{label}</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	)
}

function TokenPills({ tokens }: { tokens: string[] }) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{tokens.map((token) => (
				<span
					key={token}
					className="rounded-md border border-green-600/40 bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400"
				>
					{token}
				</span>
			))}
		</div>
	)
}

function RightsDots({ rights, labels }: { rights: [boolean, boolean, boolean]; labels: [string, string, string] }) {
	const content = (
		<div className="flex flex-col gap-1">
			{rights.map((active, index) => (
				<span key={labels[index]} className="flex items-center gap-2">
					<span
						className={
							active
								? 'h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.55)]'
								: 'h-2 w-2 rounded-full border border-green-600/40'
						}
					/>
					<span>
						{labels[index]}: {active ? 'Active' : 'Inactive'}
					</span>
				</span>
			))}
		</div>
	)

	return (
		<Tooltip content={content} className="justify-center gap-2">
			{rights.map((active, index) => (
				<span
					key={labels[index]}
					className={
						active
							? 'h-3 w-3 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.55)]'
							: 'h-3 w-3 rounded-full border-2 border-green-600/40'
					}
				/>
			))}
		</Tooltip>
	)
}

function FeeSwitchBadge({ status, details }: { status: TokenRightsFeeSwitchStatus; details: string | null }) {
	if (status === 'UNKNOWN') return <span className="text-(--text-tertiary)">-</span>
	const tooltip = details ?? TOKEN_RIGHTS_PILL_TOOLTIPS.feeSwitch
	if (status === 'ON') {
		return <TooltipStatusPill label="ON" tone="positive" tooltip={tooltip} />
	}
	if (status === 'PENDING') {
		return <TooltipStatusPill label="PENDING" tone="pending" tooltip={tooltip} />
	}
	return <TooltipStatusPill label="OFF" tone="negative" tooltip={tooltip} />
}

function EquityCaptureBadge({ value, details }: { value: string | null; details: string | null }) {
	if (!value) return <span className="text-(--text-tertiary)">-</span>
	const tooltip = details ?? TOKEN_RIGHTS_PILL_TOOLTIPS.equityRevenueCapture
	if (value === 'No') {
		return <TooltipStatusPill label="No" tone="positive" tooltip={tooltip} />
	}
	if (value === 'Yes') {
		return <TooltipStatusPill label="Yes" tone="negative" tooltip={tooltip} />
	}
	if (value === 'Partial') {
		return <TooltipStatusPill label="Partial" tone="pending" tooltip={tooltip} />
	}
	return <TooltipStatusPill label={value} tone="neutral" tooltip={tooltip} />
}

type StatusPillTone = 'positive' | 'negative' | 'pending' | 'neutral'

function getStatusPillClassName(tone: StatusPillTone, extraClassName = '') {
	const toneClassName =
		tone === 'positive'
			? 'border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400'
			: tone === 'negative'
				? 'border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-400'
				: tone === 'pending'
					? 'border-amber-600/40 bg-amber-600/10 text-amber-700 dark:text-amber-400'
					: 'border-(--cards-border) bg-(--app-bg) text-(--text-secondary)'

	return `mx-auto inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium ${toneClassName} ${extraClassName}`
}

function TooltipStatusPill({
	label,
	tone,
	tooltip,
	className: extraClassName = ''
}: {
	label: string
	tone: StatusPillTone
	tooltip: string
	className?: string
}) {
	return (
		<Tooltip
			content={tooltip}
			render={<button type="button" />}
			className={getStatusPillClassName(tone, extraClassName)}
		>
			{label}
		</Tooltip>
	)
}

function StatusPill({
	label,
	tone,
	className: extraClassName = ''
}: {
	label: string
	tone: StatusPillTone
	className?: string
}) {
	return <span className={getStatusPillClassName(tone, extraClassName)}>{label}</span>
}

function TokenRightsLegend() {
	return (
		<div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-(--text-secondary)">
			<span className="text-xs font-semibold tracking-widest text-(--text-label) uppercase">Legend</span>
			<span className="inline-flex items-center gap-2">
				<span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.55)]" />
				Active
			</span>
			<span className="inline-flex items-center gap-2">
				<span className="h-3 w-3 rounded-full border-2 border-green-600/40" />
				Inactive
			</span>
			<span className="inline-flex items-center gap-2">
				<StatusPill label="ON" tone="positive" />
				Fee Switch ON
			</span>
			<span className="inline-flex items-center gap-2">
				<StatusPill label="OFF" tone="negative" />
				Fee Switch OFF
			</span>
			<span className="inline-flex items-center gap-2">
				<StatusPill label="PENDING" tone="pending" />
				Fee Switch Pending
			</span>
		</div>
	)
}

export default TokenRightsPage
