import { createColumnHelper } from '@tanstack/react-table'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { formattedNum } from '~/utils'
import type { IRWAPlatformsOverviewRow, RWAOverviewPage } from './api.types'
import { definitions } from './definitions'
import { RWAOverviewBreakdownChart } from './OverviewBreakdownChart'
import { rwaSlug } from './rwaSlug'

const columnHelper = createColumnHelper<IRWAPlatformsOverviewRow>()

const columns = [
	columnHelper.accessor('platform', {
		id: 'platform',
		header: 'Name',
		enableSorting: false,
		cell: (info) => {
			const platform = info.getValue()
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
	0: { platform: 180 },
	640: { platform: 240 }
}

export function RWAPlatformsTable({
	platforms,
	initialChartDataset,
	page
}: {
	platforms: IRWAPlatformsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
	page: RWAOverviewPage
}) {
	return (
		<div className="flex flex-col gap-2">
			<RWAOverviewBreakdownChart page={page} initialChartDataset={initialChartDataset} stackLabel="Platforms" />
			<TableWithSearch
				data={platforms}
				columns={columns}
				placeholder="Search platforms..."
				columnToSearch="platform"
				header="Platforms"
				headingAs="h1"
				columnSizes={columnSizes}
				csvFileName="rwa-platforms"
				sortingState={[{ id: 'onChainMcap', desc: true }]}
			/>
		</div>
	)
}
