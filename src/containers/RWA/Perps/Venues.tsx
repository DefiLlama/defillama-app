import { createColumnHelper } from '@tanstack/react-table'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type {} from '~/components/Table/utils'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
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
		header: 'Name',
		enableSorting: false,
		cell: (info) => (
			<span className="flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink
					href={`/rwa/perps/venue/${rwaSlug(info.getValue())}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{info.getValue()}
				</BasicLink>
			</span>
		),
		meta: {
			headerClassName: 'w-[160px] sm:w-[220px]',
			headerHelperText: d.venue.description
		}
	}),
	columnHelper.accessor((row) => row.openInterest ?? undefined, {
		id: 'openInterest',
		header: d.openInterest.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(180px,40vw)]',
			align: 'end',
			headerHelperText: d.openInterest.description
		}
	}),
	columnHelper.accessor((row) => row.openInterestShare ?? undefined, {
		id: 'openInterestShare',
		header: d.openInterestShare.label,
		cell: (info) => `${formattedNum(info.getValue() * 100, false)}%`,
		meta: {
			headerClassName: 'w-[150px]',
			align: 'end',
			headerHelperText: d.openInterestShare.description
		}
	}),
	columnHelper.accessor((row) => row.volume24h ?? undefined, {
		id: 'volume24h',
		header: d.volume24h.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(180px,40vw)]',
			align: 'end',
			headerHelperText: d.volume24h.description
		}
	}),
	columnHelper.accessor((row) => row.volume24hShare ?? undefined, {
		id: 'volume24hShare',
		header: d.volume24hShare.label,
		cell: (info) => `${formattedNum(info.getValue() * 100, false)}%`,
		meta: {
			headerClassName: 'w-[min(190px,40vw)]',
			align: 'end',
			headerHelperText: d.volume24hShare.description
		}
	}),
	columnHelper.accessor((row) => row.markets ?? undefined, {
		id: 'markets',
		header: d.markets.label,
		cell: (info) => formattedNum(info.getValue(), false),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: d.markets.description
		}
	})
]
export function RWAPerpsVenuesOverview({
	venues,
	initialChartDataset
}: {
	venues: IRWAPerpsVenuesOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}) {
	return (
		<div className="flex flex-col gap-2">
			<RWAPerpsOverviewChart breakdown="venue" initialChartDataset={initialChartDataset} stackLabel={d.venue.label} />
			<TableWithSearch
				data={venues}
				columns={columns}
				placeholder="Search venues..."
				columnToSearch="venue"
				header="Venues"
				headingAs="h1"
				csvFileName="rwa-perps-venues.csv"
				sortingState={[{ id: 'openInterest', desc: true }]}
			/>
		</div>
	)
}
