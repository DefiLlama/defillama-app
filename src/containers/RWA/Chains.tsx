import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { Switch } from '~/components/Switch'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import rwaDefinitionsJson from '~/public/rwa-definitions.json'
import { formattedNum } from '~/utils'
import { chainIconUrl } from '~/utils'
import type { IRWAChainsOverviewRow } from './queries'
import { rwaSlug } from './rwaSlug'

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMarketcap: { label: string; description: string }
	totalActiveMarketcap: { label: string; description: string }
	totalAssetIssuers: { label: string; description: string }
	totalStablecoinsValue: { label: string; description: string }
	totalDefiActiveTvl: { label: string; description: string }
}

const definitions = rwaDefinitionsJson as RWADefinitions

const columns: ColumnDef<IRWAChainsOverviewRow>[] = [
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
		size: 180
	},
	{
		id: 'totalAssetCount',
		header: definitions.totalAssetCount.label,
		accessorKey: 'totalAssetCount',
		cell: (info) => formattedNum(info.getValue() as number, false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetCount.description },
		size: 180
	},
	{
		id: 'totalDefiActiveTvl',
		header: definitions.totalDefiActiveTvl.label,
		accessorKey: 'totalDefiActiveTvl',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalDefiActiveTvl.description },
		size: 200
	},
	{
		id: 'totalActiveMarketcap',
		header: definitions.totalActiveMarketcap.label,
		accessorKey: 'totalActiveMarketcap',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalActiveMarketcap.description },
		size: 220
	},
	{
		id: 'totalOnChainMarketcap',
		header: definitions.totalOnChainMarketcap.label,
		accessorKey: 'totalOnChainMarketcap',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalOnChainMarketcap.description },
		size: 200
	}
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { chain: 160 },
	640: { chain: 220 }
}

export function RWAChainsTable({ chains }: { chains: IRWAChainsOverviewRow[] }) {
	const [includeStablecoins, setIncludeStablecoins] = useState(false)
	const [includeGovernance, setIncludeGovernance] = useState(false)

	const onToggleStablecoins = useCallback(() => setIncludeStablecoins((v) => !v), [])
	const onToggleGovernance = useCallback(() => setIncludeGovernance((v) => !v), [])

	const data = useMemo<IRWAChainsOverviewRow[]>(() => {
		return chains.map((row) => {
			const totalOnChainMarketcap =
				row.totalOnChainMarketcap +
				(includeStablecoins ? row.stablecoinOnChainMarketcap : 0) +
				(includeGovernance ? row.governanceOnChainMarketcap : 0)

			const totalActiveMarketcap =
				row.totalActiveMarketcap +
				(includeStablecoins ? row.stablecoinActiveMarketcap : 0) +
				(includeGovernance ? row.governanceActiveMarketcap : 0)

			const totalDefiActiveTvl =
				row.totalDefiActiveTvl +
				(includeStablecoins ? row.stablecoinDefiActiveTvl : 0) +
				(includeGovernance ? row.governanceDefiActiveTvl : 0)

			let totalAssetCount = row.totalAssetCount
			let totalAssetIssuers = row.totalAssetIssuers
			if (includeStablecoins) {
				totalAssetCount += row.totalAssetCountWithStablecoins
				totalAssetIssuers += row.totalAssetIssuersWithStablecoins
			}
			if (includeGovernance) {
				totalAssetCount += row.totalAssetCountWithGovernance
				totalAssetIssuers += row.totalAssetIssuersWithGovernance
			}

			return {
				...row,
				totalOnChainMarketcap,
				totalActiveMarketcap,
				totalDefiActiveTvl,
				totalAssetIssuers,
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
			sortingState={[{ id: 'totalOnChainMarketcap', desc: true }]}
		/>
	)
}
