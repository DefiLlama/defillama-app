import { createColumnHelper } from '@tanstack/react-table'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { formattedNum } from '~/utils'
import { perpsDefinitions as d } from './definitions'
import { RWAPerpsOverviewChart } from './OverviewChart'
import type { IRWAPerpsVenuesOverviewRow } from './types'

type RWAPerpsVenuesTableRow = {
	venue: string
	openInterest: number
	openInterestShare: number
	volume24h: number
	volume24hShare: number
	markets: number
}

const columnHelper = createColumnHelper<RWAPerpsVenuesTableRow>()

const columns = [
	columnHelper.accessor('venue', {
		id: 'venue',
		header: d.venue.label,
		enableSorting: false,
		cell: (info) => (
			<span className="flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink
					href={`/rwa/perps/venue/${encodeURIComponent(info.getValue())}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.getValue()}
				</BasicLink>
			</span>
		),
		meta: { headerHelperText: d.venue.description },
		size: 220
	}),
	columnHelper.accessor('openInterest', {
		id: 'openInterest',
		header: d.openInterest.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: d.openInterest.description },
		size: 180
	}),
	columnHelper.accessor('openInterestShare', {
		id: 'openInterestShare',
		header: d.openInterestShare.label,
		cell: (info) => `${formattedNum(info.getValue() * 100, false)}%`,
		meta: { align: 'end', headerHelperText: d.openInterestShare.description },
		size: 150
	}),
	columnHelper.accessor('volume24h', {
		id: 'volume24h',
		header: d.volume24h.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: d.volume24h.description },
		size: 180
	}),
	columnHelper.accessor('volume24hShare', {
		id: 'volume24hShare',
		header: d.volume24hShare.label,
		cell: (info) => `${formattedNum(info.getValue() * 100, false)}%`,
		meta: { align: 'end', headerHelperText: d.volume24hShare.description },
		size: 190
	}),
	columnHelper.accessor('markets', {
		id: 'markets',
		header: d.markets.label,
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end', headerHelperText: d.markets.description },
		size: 140
	})
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { venue: 160 },
	640: { venue: 220 }
}

export function RWAPerpsVenuesOverview({
	venues,
	initialChartDataset
}: {
	venues: IRWAPerpsVenuesOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}) {
	return (
		<div className="flex flex-col gap-2">
			<RWAPerpsOverviewChart
				breakdown="baseAsset"
				initialChartDataset={initialChartDataset}
				stackLabel={d.baseAsset.label}
			/>
			<TableWithSearch
				data={venues}
				columns={columns}
				placeholder="Search venues..."
				columnToSearch="venue"
				header="Venues"
				headingAs="h1"
				columnSizes={columnSizes}
				csvFileName="rwa-perps-venues.csv"
				sortingState={[{ id: 'openInterest', desc: true }]}
			/>
		</div>
	)
}
