import type { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useMemo } from 'react'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { QuestionHelper } from '~/components/QuestionHelper'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { CHART_COLORS } from '~/constants/colors'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, getTokenDominance, slug, tokenIconUrl } from '~/utils'
import { useOracleOverviewExtraSeries } from './queries.client'
import { getEnabledExtraApiKeys } from './tvl'
import type { OracleOverviewPageData } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

type IProtocolTableRow = OracleOverviewPageData['protocolTableData'][number]

const DEFAULT_PROTOCOL_TABLE_SORTING_STATE = [{ id: 'tvl', desc: true }]

function getStrikeTvlText({
	row,
	extraTvlsEnabled
}: {
	row: IProtocolTableRow
	extraTvlsEnabled: Record<string, boolean>
}): string | null {
	if (!row.strikeTvl) return null

	let text = null

	if (!extraTvlsEnabled['doublecounted']) {
		text =
			'This protocol deposits into another protocol and is subtracted from total TVL because "Double Count" toggle is off'
	}

	if (!extraTvlsEnabled['liquidstaking']) {
		text =
			'This protocol is under Liquid Staking category and is subtracted from total TVL because "Liquid Staking" toggle is off'
	}

	if (!extraTvlsEnabled['doublecounted'] && !extraTvlsEnabled['liquidstaking']) {
		text =
			'This protocol deposits into another protocol or is under Liquid Staking category, so it is subtracted from total TVL because both "Liquid Staking" and "Double Count" toggles are off'
	}

	return text
}

function calculateTvsWithEnabledExtrasOnly({
	values,
	extraTvlsEnabled
}: {
	values: Record<string, number>
	extraTvlsEnabled: Record<string, boolean>
}): number {
	let tvs = values.tvl ?? 0

	for (const [extraName, value] of Object.entries(values)) {
		const normalizedName = extraName.toLowerCase()

		if (normalizedName === 'doublecounted' || normalizedName === 'liquidstaking' || normalizedName === 'dcandlsoverlap')
			continue

		if (extraTvlsEnabled[normalizedName] && normalizedName !== 'doublecounted' && normalizedName !== 'liquidstaking') {
			tvs += value
		}
	}

	return tvs
}

export const OracleOverview = ({
	chartData,
	chainLinks,
	oracle,
	tvl,
	extraTvl,
	protocolTableData,
	chain = null
}: OracleOverviewPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const protocolColumns = useMemo<ColumnDef<IProtocolTableRow>[]>(
		() => [
			{
				header: 'Name',
				accessorKey: 'name',
				enableSorting: false,
				cell: ({ getValue }) => {
					const name = getValue<string>()
					return (
						<span className="flex items-center gap-2">
							<span className="vf-row-index shrink-0" aria-hidden="true" />

							<TokenLogo logo={tokenIconUrl(name)} data-lgonly />

							<BasicLink
								href={`/protocol/${slug(name)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
							>
								{name}
							</BasicLink>
						</span>
					)
				}
			},
			{
				header: 'Category',
				accessorKey: 'category',
				enableSorting: false,
				cell: ({ getValue }) => getValue<string | null>() ?? 'Unknown',
				meta: {
					align: 'center'
				}
			},
			{
				header: 'TVL',
				accessorKey: 'tvl',
				enableSorting: true,
				cell: ({ row }) => {
					const strikeText = getStrikeTvlText({ row: row.original, extraTvlsEnabled })
					return (
						<span className="flex items-center justify-center gap-1">
							{strikeText ? <QuestionHelper text={strikeText} /> : null}
							<span className={strikeText ? 'text-(--text-disabled)' : ''}>{formattedNum(row.original.tvl, true)}</span>
						</span>
					)
				},
				meta: {
					align: 'center'
				}
			}
		],
		[extraTvlsEnabled]
	)
	const enabledExtraApiKeys = useMemo(() => getEnabledExtraApiKeys(extraTvlsEnabled), [extraTvlsEnabled])

	const { isFetchingExtraSeries, extraTvsByTimestamp } = useOracleOverviewExtraSeries({
		enabledExtraApiKeys,
		oracle,
		chain
	})

	const { tableData, totalValue } = useMemo(() => {
		const totalValue =
			enabledExtraApiKeys.length === 0
				? tvl
				: calculateTvsWithEnabledExtrasOnly({
						values: { tvl, ...extraTvl },
						extraTvlsEnabled
					})

		const tableData: Array<IProtocolTableRow> =
			enabledExtraApiKeys.length === 0
				? protocolTableData
				: protocolTableData
						.map((protocol) => {
							const protocolTvl = calculateTvsWithEnabledExtrasOnly({
								values: { tvl: protocol.tvl, ...(protocol.extraTvl ?? {}) },
								extraTvlsEnabled
							})

							return {
								...protocol,
								tvl: protocolTvl
							}
						})
						.toSorted((a, b) => b.tvl - a.tvl)

		return {
			tableData,
			totalValue
		}
	}, [enabledExtraApiKeys.length, extraTvl, extraTvlsEnabled, protocolTableData, tvl])

	const { dataset, charts } = useMemo(() => {
		const chartBreakdownByTimestamp = chartData
		const selectedOracle =
			oracle ?? Object.keys(chartBreakdownByTimestamp[0] ?? {}).find((key) => key !== 'timestamp') ?? ''
		const shouldApplyExtraSeries = enabledExtraApiKeys.length > 0 && !isFetchingExtraSeries

		const datasetSource: Array<{ timestamp: number; TVS: number }> = []

		for (const point of chartBreakdownByTimestamp) {
			const timestampInSeconds = point.timestamp
			if (!Number.isFinite(timestampInSeconds)) {
				continue
			}

			const baseTvs = selectedOracle ? (point[selectedOracle] ?? 0) : 0
			const extraTvs = shouldApplyExtraSeries ? (extraTvsByTimestamp.get(timestampInSeconds) ?? 0) : 0
			const tvsValue = baseTvs + extraTvs

			if (!Number.isFinite(tvsValue)) continue

			datasetSource.push({
				timestamp: timestampInSeconds * 1e3,
				TVS: tvsValue
			})
		}
		return {
			dataset: {
				source: datasetSource,
				dimensions: ['timestamp', 'TVS']
			},
			charts: [
				{
					type: 'line' as const,
					name: 'TVS',
					encode: { x: 'timestamp', y: 'TVS' },
					color: CHART_COLORS[0],
					stack: 'TVS'
				}
			]
		}
	}, [chartData, enabledExtraApiKeys.length, extraTvsByTimestamp, isFetchingExtraSeries, oracle])

	const topProtocol = tableData[0] ?? null
	const dominance = topProtocol ? getTokenDominance({ tvl: topProtocol.tvl }, totalValue) : null
	const dominanceText = dominance == null ? null : String(dominance)
	const displayOracle = oracle ?? 'Oracle'
	const dominanceLabel = topProtocol ? `${topProtocol.name} Dominance` : 'Top Protocol Dominance'

	return (
		<>
			<RowLinksWithDropdown links={chainLinks} activeLink={chain ?? 'All'} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">{displayOracle}</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Secured (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">{dominanceLabel}</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{dominanceText === null ? 'N/A' : `${dominanceText}%`}
						</span>
					</p>
				</div>

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					{isFetchingExtraSeries ? (
						<p className="my-auto flex min-h-[398px] items-center justify-center gap-1 text-center text-xs">
							Loading
							<LoadingDots />
						</p>
					) : (
						<Suspense fallback={<div className="min-h-[398px]" />}>
							<MultiSeriesChart2
								dataset={dataset}
								charts={charts}
								alwaysShowTooltip
								exportButtons={{ png: true, csv: true }}
							/>
						</Suspense>
					)}
				</div>
			</div>

			<Suspense
				fallback={
					<div
						style={{ minHeight: `${tableData.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={tableData}
					columns={protocolColumns}
					columnToSearch="name"
					placeholder="Search protocols..."
					header="Protocols"
					sortingState={DEFAULT_PROTOCOL_TABLE_SORTING_STATE}
					compact
				/>
			</Suspense>
		</>
	)
}
