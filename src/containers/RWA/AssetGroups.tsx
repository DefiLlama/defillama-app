import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { Switch } from '~/components/Switch'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { formattedNum } from '~/utils'
import { isTrueQueryParam, pushShallowQuery } from '~/utils/routerQuery'
import type { IRWAAssetGroupsOverviewRow, RWAOverviewPage } from './api.types'
import { definitions } from './definitions'
import { RWAOverviewBreakdownChart } from './OverviewBreakdownChart'
import { getRWAOverviewCsvFileName, getRWAOverviewInclusion, getRWAOverviewTableData } from './overviewTableData'
import { rwaSlug } from './rwaSlug'

type RWAAssetGroupsTableRow = {
	assetGroup: string
	assetCount: number
	activeMcap: number
	onChainMcap: number
	defiActiveTvl: number
}

const columnHelper = createColumnHelper<RWAAssetGroupsTableRow>()

const columns = [
	columnHelper.accessor('assetGroup', {
		id: 'assetGroup',
		header: 'Name',
		enableSorting: false,
		cell: (info) => {
			const assetGroup = info.getValue()
			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/rwa/asset-group/${rwaSlug(assetGroup)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{assetGroup}
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
		size: 160
	}),
	columnHelper.accessor('activeMcap', {
		id: 'activeMcap',
		header: definitions.totalActiveMcap.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: definitions.totalActiveMcap.description },
		size: 200
	}),
	columnHelper.accessor('onChainMcap', {
		id: 'onChainMcap',
		header: definitions.totalOnChainMcap.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: definitions.totalOnChainMcap.description },
		size: 208
	}),
	columnHelper.accessor('defiActiveTvl', {
		id: 'defiActiveTvl',
		header: definitions.totalDefiActiveTvl.label,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end', headerHelperText: definitions.totalDefiActiveTvl.description },
		size: 140
	})
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: { assetGroup: 180 },
	640: { assetGroup: 240 }
}

export function RWAAssetGroups({
	assetGroups,
	initialChartDataset,
	page
}: {
	assetGroups: IRWAAssetGroupsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
	page: RWAOverviewPage
}) {
	const router = useRouter()
	const includeStablecoins = isTrueQueryParam(router.query.includeStablecoins)
	const includeGovernance = isTrueQueryParam(router.query.includeGovernance)
	const inclusion = getRWAOverviewInclusion(includeStablecoins, includeGovernance)

	const onToggleStablecoins = () => {
		void pushShallowQuery(router, { includeStablecoins: includeStablecoins ? undefined : 'true' })
	}

	const onToggleGovernance = () => {
		void pushShallowQuery(router, { includeGovernance: includeGovernance ? undefined : 'true' })
	}

	const data = assetGroups.map((row) => ({
		assetGroup: row.assetGroup,
		...getRWAOverviewTableData(row, inclusion)
	}))
	const csvFileName = getRWAOverviewCsvFileName('rwa-asset-groups', inclusion)

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-end gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<Switch
					label="Stablecoins"
					value="includeStablecoins"
					checked={includeStablecoins}
					help="Include stablecoin-token assets in asset group totals/columns."
					onChange={onToggleStablecoins}
				/>
				<Switch
					label="Governance Tokens"
					value="includeGovernance"
					checked={includeGovernance}
					help="Include governance-token assets in asset group totals/columns."
					onChange={onToggleGovernance}
				/>
			</div>
			<RWAOverviewBreakdownChart page={page} initialChartDataset={initialChartDataset} stackLabel="Asset Groups" />
			<TableWithSearch
				data={data}
				columns={columns}
				placeholder="Search asset groups..."
				columnToSearch="assetGroup"
				header="Asset Groups"
				headingAs="h1"
				columnSizes={columnSizes}
				csvFileName={csvFileName}
				sortingState={[{ id: 'activeMcap', desc: true }]}
			/>
		</div>
	)
}
