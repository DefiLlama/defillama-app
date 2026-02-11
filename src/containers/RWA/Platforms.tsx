import type { ColumnDef } from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import rwaDefinitionsJson from '~/public/rwa-definitions.json'
import { formattedNum } from '~/utils'
import type { IRWAPlatformsOverviewRow } from './queries'
import { rwaSlug } from './rwaSlug'

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMcap: { label: string; description: string }
	totalActiveMcap: { label: string; description: string }
	totalDefiActiveTvl: { label: string; description: string }
}

const definitions = rwaDefinitionsJson as RWADefinitions

const columns: ColumnDef<IRWAPlatformsOverviewRow>[] = [
	{
		id: 'platform',
		header: 'Name',
		accessorKey: 'platform',
		enableSorting: false,
		cell: (info) => {
			const platform = info.getValue() as string
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/rwa/platform/${rwaSlug(platform)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{platform}
					</BasicLink>
				</span>
			)
		},
		size: 240
	},
	{
		id: 'assetCount',
		header: definitions.totalAssetCount.label,
		accessorKey: 'assetCount',
		cell: (info) => formattedNum(info.getValue() as number, false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetCount.description },
		size: 148
	},
	{
		id: 'defiActiveTvl',
		header: definitions.totalDefiActiveTvl.label,
		accessorKey: 'defiActiveTvl',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalDefiActiveTvl.description },
		size: 148
	},
	{
		id: 'activeMcap',
		header: definitions.totalActiveMcap.label,
		accessorKey: 'activeMcap',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalActiveMcap.description },
		size: 228
	},
	{
		id: 'onChainMcap',
		header: definitions.totalOnChainMcap.label,
		accessorKey: 'onChainMcap',
		cell: (info) => formattedNum(info.getValue() as number, true),
		meta: { align: 'end', headerHelperText: definitions.totalOnChainMcap.description },
		size: 168
	}
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { platform: 180 },
	640: { platform: 240 }
}

export function RWAPlatformsTable({ platforms }: { platforms: IRWAPlatformsOverviewRow[] }) {
	return (
		<TableWithSearch
			data={platforms}
			columns={columns}
			placeholder="Search platforms..."
			columnToSearch="platform"
			header="Platforms"
			columnSizes={columnSizes}
			customFilters={({ instance }) => (
				<CSVDownloadButton
					prepareCsv={() => {
						const filename = 'rwa-platforms.csv'

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
			)}
			sortingState={[{ id: 'onChainMcap', desc: true }]}
		/>
	)
}
