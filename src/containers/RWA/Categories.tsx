import { createColumnHelper } from '@tanstack/react-table'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { formattedNum } from '~/utils'
import type { IRWACategoriesOverviewRow, RWAOverviewPage } from './api.types'
import { definitions } from './definitions'
import { RWAOverviewBreakdownChart } from './OverviewBreakdownChart'
import { rwaSlug } from './rwaSlug'

const columnHelper = createColumnHelper<IRWACategoriesOverviewRow>()

const columns = [
	columnHelper.accessor('category', {
		id: 'category',
		header: 'Name',
		enableSorting: false,
		cell: (info) => {
			const category = info.getValue()
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
	}),
	columnHelper.accessor('assetIssuers', {
		id: 'assetIssuers',
		header: definitions.totalAssetIssuers.label,
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetIssuers.description },
		size: 168
	}),
	columnHelper.accessor('assetCount', {
		id: 'assetCount',
		header: definitions.totalAssetCount.label,
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end', headerHelperText: definitions.totalAssetCount.description },
		size: 148
	}),
	columnHelper.accessor('defiActiveTvl', {
		id: 'defiActiveTvl',
		header: definitions.totalDefiActiveTvl.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: definitions.totalDefiActiveTvl.description },
		size: 148
	}),
	columnHelper.accessor('activeMcap', {
		id: 'activeMcap',
		header: definitions.totalActiveMcap.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: definitions.totalActiveMcap.description },
		size: 228
	}),
	columnHelper.accessor('onChainMcap', {
		id: 'onChainMcap',
		header: definitions.totalOnChainMcap.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: definitions.totalOnChainMcap.description },
		size: 168
	})
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { category: 180 },
	640: { category: 240 }
}

export function RWACategoriesTable({
	categories,
	initialChartDataset,
	page
}: {
	categories: IRWACategoriesOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
	page: RWAOverviewPage
}) {
	return (
		<div className="flex flex-col gap-2">
			<RWAOverviewBreakdownChart page={page} initialChartDataset={initialChartDataset} stackLabel="Categories" />
			<TableWithSearch
				data={categories}
				columns={columns}
				placeholder="Search categories..."
				columnToSearch="category"
				header="Categories"
				headingAs="h1"
				columnSizes={columnSizes}
				csvFileName="rwa-categories"
				sortingState={[{ id: 'onChainMcap', desc: true }]}
			/>
		</div>
	)
}
