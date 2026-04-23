import { createColumnHelper } from '@tanstack/react-table'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { formattedNum } from '~/utils'
import { perpsDefinitions as d } from './definitions'
import { RWAPerpsOverviewChart } from './OverviewChart'
import type { IRWAPerpsAssetGroupsOverviewRow } from './types'

const columnHelper = createColumnHelper<IRWAPerpsAssetGroupsOverviewRow>()

const columns = [
	columnHelper.accessor('assetGroup', {
		id: 'assetGroup',
		header: 'Name',
		enableSorting: false,
		cell: (info) => (
			<span className="flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink
					href={`/rwa/perps/asset-group/${rwaSlug(info.getValue())}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.getValue()}
				</BasicLink>
			</span>
		),
		meta: { headerHelperText: d.assetGroup.description },
		size: 220
	}),
	columnHelper.accessor((row) => row.openInterest ?? undefined, {
		id: 'openInterest',
		header: d.openInterest.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: d.openInterest.description },
		size: 180
	}),
	columnHelper.accessor((row) => row.openInterestShare ?? undefined, {
		id: 'openInterestShare',
		header: d.openInterestShare.label,
		cell: (info) => `${formattedNum(info.getValue() * 100, false)}%`,
		meta: { align: 'end', headerHelperText: d.openInterestShare.description },
		size: 150
	}),
	columnHelper.accessor((row) => row.volume24h ?? undefined, {
		id: 'volume24h',
		header: d.volume24h.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: d.volume24h.description },
		size: 180
	}),
	columnHelper.accessor((row) => row.volume24hShare ?? undefined, {
		id: 'volume24hShare',
		header: d.volume24hShare.label,
		cell: (info) => `${formattedNum(info.getValue() * 100, false)}%`,
		meta: { align: 'end', headerHelperText: d.volume24hShare.description },
		size: 190
	}),
	columnHelper.accessor((row) => row.markets ?? undefined, {
		id: 'markets',
		header: d.markets.label,
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end', headerHelperText: d.markets.description },
		size: 140
	})
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { assetGroup: 160 },
	640: { assetGroup: 220 }
}

export function RWAPerpsAssetGroupsOverview({
	assetGroups,
	initialChartDataset
}: {
	assetGroups: IRWAPerpsAssetGroupsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}) {
	return (
		<div className="flex flex-col gap-2">
			<RWAPerpsOverviewChart
				breakdown="assetGroup"
				initialChartDataset={initialChartDataset}
				stackLabel={d.assetGroup.label}
			/>
			<TableWithSearch
				data={assetGroups}
				columns={columns}
				placeholder="Search asset groups..."
				columnToSearch="assetGroup"
				header="Asset Groups"
				headingAs="h1"
				columnSizes={columnSizes}
				csvFileName="rwa-perps-asset-groups.csv"
				sortingState={[{ id: 'openInterest', desc: true }]}
			/>
		</div>
	)
}
