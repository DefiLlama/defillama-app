import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useCallback, useMemo } from 'react'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { Switch } from '~/components/Switch'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type {} from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'
import { isTrueQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import type { IRWAChainsOverviewRow, RWAOverviewPage } from './api.types'
import { definitions } from './definitions'
import { RWAOverviewBreakdownChart } from './OverviewBreakdownChart'
import { rwaSlug } from './rwaSlug'

type RWAChainsTableRow = {
	chain: string
	totalOnChainMcap: number
	totalActiveMcap: number
	totalDefiActiveTvl: number
	totalAssetIssuers: number
	totalAssetCount: number
}

const columnHelper = createColumnHelper<RWAChainsTableRow>()

const columns = [
	columnHelper.accessor('chain', {
		id: 'chain',
		header: 'Name',
		enableSorting: false,
		cell: (info) => {
			const chain = info.getValue()
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo name={chain} kind="chain" data-lgonly alt={`Logo of ${chain}`} />
					<BasicLink
						href={`/rwa/chain/${rwaSlug(chain)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{chain}
					</BasicLink>
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[160px] sm:w-[220px]'
		}
	}),
	columnHelper.accessor((row) => row.totalAssetIssuers ?? undefined, {
		id: 'totalAssetIssuers',
		header: definitions.totalAssetIssuers.label,
		cell: (info) => formattedNum(info.getValue(), false),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: definitions.totalAssetIssuers.description
		}
	}),
	columnHelper.accessor((row) => row.totalAssetCount ?? undefined, {
		id: 'totalAssetCount',
		header: definitions.totalAssetCount.label,
		cell: (info) => formattedNum(info.getValue(), false),
		meta: {
			headerClassName: 'w-[160px]',
			align: 'end',
			headerHelperText: definitions.totalAssetCount.description
		}
	}),
	columnHelper.accessor((row) => row.totalActiveMcap ?? undefined, {
		id: 'totalActiveMcap',
		header: definitions.totalActiveMcap.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(200px,40vw)]',
			align: 'end',
			headerHelperText: definitions.totalActiveMcap.description
		}
	}),
	columnHelper.accessor((row) => row.totalOnChainMcap ?? undefined, {
		id: 'totalOnChainMcap',
		header: definitions.totalOnChainMcap.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(208px,40vw)]',
			align: 'end',
			headerHelperText: definitions.totalOnChainMcap.description
		}
	}),
	columnHelper.accessor((row) => row.totalDefiActiveTvl ?? undefined, {
		id: 'totalDefiActiveTvl',
		header: definitions.totalDefiActiveTvl.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: definitions.totalDefiActiveTvl.description
		}
	})
]
export function RWAChains({
	chains,
	initialChartDataset,
	page
}: {
	chains: IRWAChainsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
	page: RWAOverviewPage
}) {
	const router = useRouter()
	const stablecoinsQ = router.query.includeStablecoins as string | string[] | undefined
	const governanceQ = router.query.includeGovernance as string | string[] | undefined

	const includeStablecoins = stablecoinsQ != null ? isTrueQueryParam(stablecoinsQ) : false
	const includeGovernance = governanceQ != null ? isTrueQueryParam(governanceQ) : false

	const onToggleStablecoins = useCallback(() => {
		void pushShallowQuery(router, { includeStablecoins: includeStablecoins ? undefined : 'true' })
	}, [includeStablecoins, router])

	const onToggleGovernance = useCallback(() => {
		void pushShallowQuery(router, { includeGovernance: includeGovernance ? undefined : 'true' })
	}, [includeGovernance, router])

	const data = useMemo(() => {
		return chains.map((row) => {
			let totalOnChainMcap = row.base.onChainMcap
			if (includeStablecoins) {
				totalOnChainMcap += row.stablecoinsOnly.onChainMcap
			}
			if (includeGovernance) {
				totalOnChainMcap += row.governanceOnly.onChainMcap
			}
			if (includeStablecoins || includeGovernance) {
				totalOnChainMcap += row.stablecoinsAndGovernance.onChainMcap
			}

			let totalActiveMcap = row.base.activeMcap
			if (includeStablecoins) {
				totalActiveMcap += row.stablecoinsOnly.activeMcap
			}
			if (includeGovernance) {
				totalActiveMcap += row.governanceOnly.activeMcap
			}
			if (includeStablecoins || includeGovernance) {
				totalActiveMcap += row.stablecoinsAndGovernance.activeMcap
			}

			let totalDefiActiveTvl = row.base.defiActiveTvl
			if (includeStablecoins) {
				totalDefiActiveTvl += row.stablecoinsOnly.defiActiveTvl
			}
			if (includeGovernance) {
				totalDefiActiveTvl += row.governanceOnly.defiActiveTvl
			}
			if (includeStablecoins || includeGovernance) {
				totalDefiActiveTvl += row.stablecoinsAndGovernance.defiActiveTvl
			}

			let totalAssetCount = row.base.assetCount
			if (includeStablecoins) {
				totalAssetCount += row.stablecoinsOnly.assetCount
			}
			if (includeGovernance) {
				totalAssetCount += row.governanceOnly.assetCount
			}
			if (includeStablecoins || includeGovernance) {
				totalAssetCount += row.stablecoinsAndGovernance.assetCount
			}

			let totalAssetIssuers = [...row.base.assetIssuers]
			if (includeStablecoins) {
				totalAssetIssuers.push(...row.stablecoinsOnly.assetIssuers)
			}
			if (includeGovernance) {
				totalAssetIssuers.push(...row.governanceOnly.assetIssuers)
			}
			if (includeStablecoins || includeGovernance) {
				totalAssetIssuers.push(...row.stablecoinsAndGovernance.assetIssuers)
			}

			return {
				chain: row.chain,
				totalOnChainMcap,
				totalActiveMcap,
				totalDefiActiveTvl,
				totalAssetIssuers: Array.from(new Set(totalAssetIssuers)).length,
				totalAssetCount
			}
		})
	}, [chains, includeGovernance, includeStablecoins])
	const csvFileName = (() => {
		const parts = ['rwa-chains']
		if (includeStablecoins) parts.push('stablecoins')
		if (includeGovernance) parts.push('governance')
		return `${parts.join('-')}.csv`
	})()

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-end gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<Switch
					label="Stablecoins"
					value="includeStablecoins"
					checked={includeStablecoins}
					help="Include stablecoin-token assets in chain totals/columns."
					onChange={onToggleStablecoins}
				/>
				<Switch
					label="Governance Tokens"
					value="includeGovernance"
					checked={includeGovernance}
					help="Include governance-token assets in chain totals/columns."
					onChange={onToggleGovernance}
				/>
			</div>
			<RWAOverviewBreakdownChart page={page} initialChartDataset={initialChartDataset} stackLabel="Chains" />
			<TableWithSearch
				data={data}
				columns={columns}
				placeholder="Search chains..."
				columnToSearch="chain"
				header="Chains"
				headingAs="h1"
				csvFileName={csvFileName}
				sortingState={[{ id: 'totalActiveMcap', desc: true }]}
			/>
		</div>
	)
}
