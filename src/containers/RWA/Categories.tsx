import { ColumnDef } from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import rwaDefinitionsJson from '~/public/rwa-definitions.json'
import { formattedNum } from '~/utils'
import type { IRWACategoriesOverviewRow } from './queries'
import { rwaSlug } from './rwaSlug'

type RWADefinitions = typeof rwaDefinitionsJson & {
	totalOnChainMarketcap: { label: string; description: string }
	totalActiveMarketcap: { label: string; description: string }
	totalAssetIssuers: { label: string; description: string }
	totalStablecoinsValue: { label: string; description: string }
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
		id: 'totalAssetIssuers',
		header: definitions.totalAssetIssuers.label,
		accessorKey: 'totalAssetIssuers',
		cell: (info) => formattedNum(info.getValue() as number, false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetIssuers.description },
		size: 180
	},
	{
		id: 'totalAssetsCount',
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
				/>
			)}
			sortingState={[{ id: 'totalOnChainMarketcap', desc: true }]}
		/>
	)
}
