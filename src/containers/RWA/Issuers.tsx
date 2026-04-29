import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import TreemapChart from '~/components/ECharts/TreemapChart'
import { BasicLink } from '~/components/Link'
import { Switch } from '~/components/Switch'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { formattedNum } from '~/utils'
import { isTrueQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import { computeHHI, computeNakamotoCoefficient, computeTopNShare } from './issuerStats'
import { getRWAOverviewCsvFileName, getRWAOverviewInclusion } from './overviewTableData'
import { rwaSlug } from './rwaSlug'
import { buildRwaTreemapTreeData, type RwaTreemapNode } from './treemap'

export type RWAIssuerSlice = {
	assetCount: number
	activeMcap: number
	onChainMcap: number
	defiActiveTvl: number
	chains: string[]
}

export type RWAIssuerSegmentedRow = {
	issuer: string
	base: RWAIssuerSlice
	stablecoinsOnly: RWAIssuerSlice
	governanceOnly: RWAIssuerSlice
	stablecoinsAndGovernance: RWAIssuerSlice
}

type RWAIssuerTableRow = {
	issuer: string
	assetCount: number
	activeMcap: number
	onChainMcap: number
	defiActiveTvl: number
	chains: number
}

const columnHelper = createColumnHelper<RWAIssuerTableRow>()

const columns = [
	columnHelper.accessor('issuer', {
		id: 'issuer',
		header: 'Name',
		enableSorting: false,
		cell: (info) => {
			const issuer = info.getValue()
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/rwa/issuer/${rwaSlug(issuer)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{issuer}
					</BasicLink>
				</span>
			)
		},
		size: 260
	}),
	columnHelper.accessor((row) => row.assetCount ?? undefined, {
		id: 'assetCount',
		header: 'Assets',
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end' },
		size: 120
	}),
	columnHelper.accessor((row) => row.activeMcap ?? undefined, {
		id: 'activeMcap',
		header: 'Active Mcap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 180
	}),
	columnHelper.accessor((row) => row.onChainMcap ?? undefined, {
		id: 'onChainMcap',
		header: 'Onchain Mcap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 180
	}),
	columnHelper.accessor((row) => row.defiActiveTvl ?? undefined, {
		id: 'defiActiveTvl',
		header: 'DeFi Active TVL',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 180
	}),
	columnHelper.accessor((row) => row.chains ?? undefined, {
		id: 'chains',
		header: 'Chains',
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end' },
		size: 110
	})
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { issuer: 220 },
	640: { issuer: 260 }
}

export function RWAIssuers({ rows }: { rows: RWAIssuerSegmentedRow[] }) {
	const router = useRouter()
	const includeStablecoins = isTrueQueryParam(router.query.includeStablecoins)
	const includeGovernance = isTrueQueryParam(router.query.includeGovernance)
	const inclusion = useMemo(
		() => getRWAOverviewInclusion(includeStablecoins, includeGovernance),
		[includeStablecoins, includeGovernance]
	)

	const onToggleStablecoins = () => {
		void pushShallowQuery(router, { includeStablecoins: includeStablecoins ? undefined : 'true' })
	}

	const onToggleGovernance = () => {
		void pushShallowQuery(router, { includeGovernance: includeGovernance ? undefined : 'true' })
	}

	const data = useMemo(
		() =>
			rows
				.map((row) => ({ issuer: row.issuer, ...getIssuerOverviewTableData(row, inclusion) }))
				.filter((row) => row.assetCount > 0),
		[rows, inclusion]
	)
	const issuerShares = useMemo(() => data.map((r) => r.onChainMcap ?? 0).filter((v) => v > 0), [data])
	const hhi = computeHHI(issuerShares)
	const top5 = computeTopNShare(issuerShares, 5)
	const nakamoto50 = computeNakamotoCoefficient(issuerShares, 0.5)

	const treemapTreeData = useMemo((): RwaTreemapNode[] => {
		const pieData = data.filter((r) => (r.onChainMcap ?? 0) > 0).map((r) => ({ name: r.issuer, value: r.onChainMcap }))
		return buildRwaTreemapTreeData(pieData, 'Issuer')
	}, [data])
	const csvFileName = getRWAOverviewCsvFileName('rwa-issuers', inclusion)

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-end gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<Switch
					label="Stablecoins"
					value="includeStablecoins"
					checked={includeStablecoins}
					help="Include stablecoin-token assets in issuer totals/columns."
					onChange={onToggleStablecoins}
				/>
				<Switch
					label="Governance Tokens"
					value="includeGovernance"
					checked={includeGovernance}
					help="Include governance-token assets in issuer totals/columns."
					onChange={onToggleGovernance}
				/>
			</div>
			<div className="grid grid-cols-2 gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 sm:grid-cols-4">
				<div className="flex flex-col gap-0.5">
					<span className="text-xs text-(--text-tertiary)">Issuers</span>
					<span className="text-base font-semibold">{formattedNum(data.length, false)}</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-xs text-(--text-tertiary)">HHI</span>
					<span className="text-base font-semibold">{hhi.toFixed(3)}</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-xs text-(--text-tertiary)">Top 5 share</span>
					<span className="text-base font-semibold">{(top5 * 100).toFixed(1)}%</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-xs text-(--text-tertiary)">Nakamoto (50%)</span>
					<span className="text-base font-semibold">{formattedNum(nakamoto50, false)}</span>
				</div>
			</div>

			{treemapTreeData.length ? (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<h2 className="text-sm font-semibold">Onchain market cap by issuer</h2>
					<div className="mt-2">
						<TreemapChart treeData={treemapTreeData} variant="rwa" height="360px" valueLabel="Onchain Mcap" />
					</div>
				</div>
			) : null}

			<TableWithSearch
				data={data}
				columns={columns}
				columnSizes={columnSizes}
				csvFileName={csvFileName}
				placeholder="Search issuers..."
				columnToSearch="issuer"
				header="Issuers"
				headingAs="h1"
				sortingState={[{ id: 'onChainMcap', desc: true }]}
			/>
		</div>
	)
}

function getIssuerOverviewTableData(row: RWAIssuerSegmentedRow, inclusion: ReturnType<typeof getRWAOverviewInclusion>) {
	const chains = new Set<string>()
	let assetCount = 0
	let activeMcap = 0
	let onChainMcap = 0
	let defiActiveTvl = 0

	const addSlice = (slice: RWAIssuerSlice) => {
		assetCount += slice.assetCount
		activeMcap += slice.activeMcap
		onChainMcap += slice.onChainMcap
		defiActiveTvl += slice.defiActiveTvl
		for (const chain of slice.chains) chains.add(chain)
	}

	switch (inclusion.kind) {
		case 'base':
			addSlice(row.base)
			break
		case 'stablecoins':
			addSlice(row.base)
			addSlice(row.stablecoinsOnly)
			addSlice(row.stablecoinsAndGovernance)
			break
		case 'governance':
			addSlice(row.base)
			addSlice(row.governanceOnly)
			addSlice(row.stablecoinsAndGovernance)
			break
		case 'all':
			addSlice(row.base)
			addSlice(row.stablecoinsOnly)
			addSlice(row.governanceOnly)
			addSlice(row.stablecoinsAndGovernance)
			break
	}

	return { assetCount, activeMcap, onChainMcap, defiActiveTvl, chains: chains.size }
}
