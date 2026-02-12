import type { ColumnDef } from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import rwaDefinitionsJson from '~/public/rwa-definitions.json'
import { formattedNum } from '~/utils'
import type { IRWACategoriesOverviewRow } from './api.types'
import { rwaSlug } from './rwaSlug'

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMcap: { label: string; description: string }
	totalActiveMcap: { label: string; description: string }
	totalAssetIssuers: { label: string; description: string }
	totalDefiActiveTvl: { label: string; description: string }
}

const definitions = rwaDefinitionsJson as RWADefinitions

const columns: ColumnDef<IRWACategoriesOverviewRow>[] = [
	{
		id: 'category',
		header: 'Name',
		accessorKey: 'category',
		enableSorting: false,
		cell: (info) => {
			const category = info.getValue() as string
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/rwa/category/${rwaSlug(category)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{category}
					</BasicLink>
				</span>
			)
		},
		size: 240
	},
	{
		id: 'assetIssuers',
		header: definitions.totalAssetIssuers.label,
		accessorKey: 'assetIssuers',
		cell: (info) => formattedNum(info.getValue() as number, false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetIssuers.description },
		size: 168
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
	0: { category: 180 },
	640: { category: 240 }
}

export function RWACategoriesTable({ categories }: { categories: IRWACategoriesOverviewRow[] }) {
	return (
		<TableWithSearch
			data={categories}
			columns={columns}
			placeholder="Search categories..."
			columnToSearch="category"
			header="Categories"
			columnSizes={columnSizes}
			customFilters={({ instance }) => (
				<CSVDownloadButton
					prepareCsv={() => {
						const filename = 'rwa-categories.csv'

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
