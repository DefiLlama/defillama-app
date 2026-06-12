import { createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { IconsRow } from '~/components/IconsRow'
import { chainHref, toChainIconItems } from '~/components/IconsRow/utils'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, slug } from '~/utils'
import { getEnabledExtraTvlApiKeys, getEnabledForkOracleExtraTvlChartApiKeys } from '~/utils/tvlOverlap'
import { buildOraclesByChainDominanceData, buildOraclesByChainTableAndPieData } from './byChainData'
import { useOraclesByChainExtraBreakdowns } from './queries.client'
import type { OraclesByChainPageData } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart'))
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const DEFAULT_SORTING_STATE = [{ id: 'tvl', desc: true }]

export const OraclesByChain = ({
	chartData,
	tableData,
	oracles,
	chainLinks,
	oraclesColors,
	chain
}: OraclesByChainPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const enabledExtraApiKeys = React.useMemo(() => getEnabledExtraTvlApiKeys(extraTvlsEnabled), [extraTvlsEnabled])
	const enabledExtraChartApiKeys = React.useMemo(
		() => getEnabledForkOracleExtraTvlChartApiKeys(extraTvlsEnabled),
		[extraTvlsEnabled]
	)
	const hasEnabledExtras = enabledExtraApiKeys.length > 0

	const { extraBreakdownsByApiKey, isFetchingExtraBreakdowns } = useOraclesByChainExtraBreakdowns({
		enabledExtraApiKeys: enabledExtraChartApiKeys,
		chain
	})

	const shouldApplyExtraTvlFormatting = enabledExtraChartApiKeys.length > 0 && !isFetchingExtraBreakdowns

	const tableAndPieData = React.useMemo(() => {
		return buildOraclesByChainTableAndPieData({ tableData, extraTvlsEnabled, hasEnabledExtras })
	}, [extraTvlsEnabled, hasEnabledExtras, tableData])

	const dominanceData = React.useMemo(() => {
		return buildOraclesByChainDominanceData({
			chartData,
			oracles,
			oraclesColors,
			extraBreakdownsByApiKey,
			extraTvlsEnabled,
			shouldApplyExtraTvlFormatting
		})
	}, [chartData, extraBreakdownsByApiKey, extraTvlsEnabled, oracles, shouldApplyExtraTvlFormatting, oraclesColors])

	const activeLink = chain ?? 'All'

	return (
		<>
			<RowLinksWithDropdown links={chainLinks} activeLink={activeLink} />

			<div className="flex flex-col gap-2 xl:flex-row">
				<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={tableAndPieData.pieData}
							stackColors={oraclesColors}
							exportButtons={{ png: true, csv: true, filename: 'oracles-tvs-pie', pngTitle: 'Oracles TVS' }}
						/>
					</React.Suspense>
				</div>
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					{isFetchingExtraBreakdowns ? (
						<p className="my-auto flex min-h-[398px] items-center justify-center gap-1 text-center text-xs">
							Loading
							<LoadingDots />
						</p>
					) : (
						<React.Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={dominanceData.dominanceDataset}
								charts={dominanceData.dominanceCharts}
								stacked={true}
								expandTo100Percent={true}
								hideDefaultLegend
								valueSymbol="%"
							/>
						</React.Suspense>
					)}
				</div>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${tableAndPieData.tableData.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={tableAndPieData.tableData}
					columns={columns}
					columnToSearch="name"
					placeholder="Search oracles..."
					header="Oracle Rankings"
					headingAs="h1"
					csvFileName="oracle-rankings"
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</>
	)
}

type IOracleTableRow = OraclesByChainPageData['tableData'][number]
const columnHelper = createColumnHelper<IOracleTableRow>()

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const name = getValue()
			return (
				<span className="relative flex items-center gap-2">
					<BasicLink
						href={`/oracles/${slug(name)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[min(240px,40vw)]'
		}
	}),
	columnHelper.accessor('chains', {
		header: 'Chains',
		enableSorting: false,
		cell: ({ row }) => {
			const chains = row.original.chains ?? []
			return (
				<div className="flex items-center justify-end gap-1 overflow-hidden">
					<IconsRow items={toChainIconItems(chains, (chain) => chainHref('/oracles/chain', chain))} />
				</div>
			)
		},
		meta: {
			headerClassName: 'w-[min(200px,40vw)]',
			align: 'end',
			headerHelperText: 'Chains secured by the oracle'
		}
	}),
	columnHelper.accessor('protocolsSecured', {
		header: 'Protocols',
		meta: {
			headerClassName: 'w-[100px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('tvl', {
		header: 'TVS',
		enableSorting: true,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: 'Total Value Secured by the Oracle'
		}
	})
]
