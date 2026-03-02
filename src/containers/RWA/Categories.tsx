import type { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { formattedNum } from '~/utils'
import type { IRWABreakdownDatasetsByMetric, IRWACategoriesOverviewRow } from './api.types'
import { definitions } from './definitions'
import { RWAOverviewBreakdownChart } from './OverviewBreakdownChart'
import { rwaSlug } from './rwaSlug'

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

export function RWACategoriesTable({
	categories,
	chartDatasets
}: {
	categories: IRWACategoriesOverviewRow[]
	chartDatasets: IRWABreakdownDatasetsByMetric
}) {
	return (
		<div className="flex flex-col gap-2">
			<RWAOverviewBreakdownChart datasets={chartDatasets} stackLabel="Categories" />
			<TableWithSearch
				data={categories}
				columns={columns}
				placeholder="Search categories..."
				columnToSearch="category"
				header="Categories"
				columnSizes={columnSizes}
				csvFileName="rwa-categories"
				sortingState={[{ id: 'onChainMcap', desc: true }]}
			/>
		</div>
	)
}
