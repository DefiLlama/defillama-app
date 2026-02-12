import type { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useCallback, useMemo } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { Switch } from '~/components/Switch'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import rwaDefinitionsJson from '~/public/rwa-definitions.json'
import { formattedNum } from '~/utils'
import { chainIconUrl } from '~/utils'
import type { IRWAChainsOverviewRow } from './api.types'
import { rwaSlug } from './rwaSlug'

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMcap: { label: string; description: string }
	totalActiveMcap: { label: string; description: string }
	totalAssetIssuers: { label: string; description: string }
	totalDefiActiveTvl: { label: string; description: string }
}

const definitions = rwaDefinitionsJson as RWADefinitions

const columns: ColumnDef<{
	chain: string
	totalOnChainMcap: number
	totalActiveMcap: number
	totalDefiActiveTvl: number
	totalAssetIssuers: number
	totalAssetCount: number
}>[] = [
	{
		id: 'chain',
		header: 'Name',
		accessorKey: 'chain',
		enableSorting: false,
		cell: (info) => {
			const chain = info.getValue() as string
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={chainIconUrl(chain)} data-lgonly />
					<BasicLink
						href={`/rwa/chain/${rwaSlug(chain)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{chain}
					</BasicLink>
				</span>
			)
		},
		size: 220
	},
	{
		id: 'totalAssetIssuers',
		header: definitions.totalAssetIssuers.label,
		accessorKey: 'totalAssetIssuers',
		cell: (info) => formattedNum(info.getValue() as number, false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetIssuers.description },
		size: 168
	},
	{
		id: 'totalAssetCount',
		header: definitions.totalAssetCount.label,
		accessorKey: 'totalAssetCount',
		cell: (info) => formattedNum(info.getValue() as number, false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetCount.description },
		size: 148
	},
	{
		id: 'totalDefiActiveTvl',
		header: definitions.totalDefiActiveTvl.label,
		accessorKey: 'totalDefiActiveTvl',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalDefiActiveTvl.description },
		size: 148
	},
	{
		id: 'totalActiveMcap',
		header: definitions.totalActiveMcap.label,
		accessorKey: 'totalActiveMcap',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalActiveMcap.description },
		size: 228
	},
	{
		id: 'totalOnChainMcap',
		header: definitions.totalOnChainMcap.label,
		accessorKey: 'totalOnChainMcap',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalOnChainMcap.description },
		size: 168
	}
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { chain: 160 },
	640: { chain: 220 }
}

const toBooleanParam = (p: string | string[] | undefined): boolean => {
	if (Array.isArray(p)) return p[0] === 'true'
	return p === 'true'
}

export function RWAChainsTable({ chains }: { chains: IRWAChainsOverviewRow[] }) {
	const router = useRouter()
	const stablecoinsQ = router.query.includeStablecoins as string | string[] | undefined
	const governanceQ = router.query.includeGovernance as string | string[] | undefined

	const includeStablecoins = stablecoinsQ != null ? toBooleanParam(stablecoinsQ) : false
	const includeGovernance = governanceQ != null ? toBooleanParam(governanceQ) : false

	const onToggleStablecoins = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		if (!includeStablecoins) {
			nextQuery.includeStablecoins = 'true'
		} else {
			delete nextQuery.includeStablecoins
		}
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}, [includeStablecoins, router])

	const onToggleGovernance = useCallback(() => {
		const nextQuery: Record<string, any> = { ...router.query }
		if (!includeGovernance) {
			nextQuery.includeGovernance = 'true'
		} else {
			delete nextQuery.includeGovernance
		}
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
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

	return (
		<TableWithSearch
			data={data}
			columns={columns}
			placeholder="Search chains..."
			columnToSearch="chain"
			header="Chains"
			columnSizes={columnSizes}
			customFilters={({ instance }) => (
				<>
					<CSVDownloadButton
						prepareCsv={() => {
							const filenameParts = ['rwa-chains']
							if (includeStablecoins) filenameParts.push('stablecoins')
							if (includeGovernance) filenameParts.push('governance')
							const filename = `${filenameParts.join('-')}.csv`

							const headers = columns.map((c) => (typeof c.header === 'string' ? c.header : (c.id ?? '')))
							const columnIds = columns.map((c) => c.id as string)

							const rows = instance
								.getRowModel()
								.rows.map((row) =>
									columnIds.map((columnId) => (row.getValue(columnId) ?? '') as string | number | boolean)
								)

							return { filename, rows: [headers, ...rows] }
						}}
						smol
					/>
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
				</>
			)}
			sortingState={[{ id: 'totalOnChainMcap', desc: true }]}
		/>
	)
}
