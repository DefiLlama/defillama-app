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
import { useForkByProtocolExtraSeries } from './queries.client'
import { calculateTvlWithExtraToggles, getEnabledExtraApiKeys } from './tvl'
import type { ForkPageData, ForkProtocolWithBreakdown } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const DEFAULT_PROTOCOL_TABLE_SORTING_STATE = [{ id: 'tvl', desc: true }]

function getStrikeTvlText({
	row,
	extraTvlsEnabled
}: {
	row: ForkProtocolWithBreakdown
	extraTvlsEnabled: Record<string, boolean>
}): string | null {
	if (!row.strikeTvl) return null

	if (!extraTvlsEnabled['doublecounted'] && !extraTvlsEnabled['liquidstaking']) {
		return 'This protocol deposits into another protocol or is under Liquid Staking category, so it is subtracted from total TVL because both "Liquid Staking" and "Double Count" toggles are off'
	} else if (!extraTvlsEnabled['doublecounted']) {
		return 'This protocol deposits into another protocol and is subtracted from total TVL because "Double Count" toggle is off'
	} else if (!extraTvlsEnabled['liquidstaking']) {
		return 'This protocol is under Liquid Staking category and is subtracted from total TVL because "Liquid Staking" toggle is off'
	}

	return null
}

export const ForksByProtocol = ({ fork, forkLinks, protocolTableData, chartData }: ForkPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const enabledExtraApiKeys = useMemo(() => getEnabledExtraApiKeys(extraTvlsEnabled), [extraTvlsEnabled])
	const { isFetchingExtraSeries, extraTvsByTimestamp } = useForkByProtocolExtraSeries({
		enabledExtraApiKeys,
		protocol: fork
	})

	const protocolColumns = useMemo<ColumnDef<ForkProtocolWithBreakdown>[]>(
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
				meta: { align: 'center' }
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
				meta: { align: 'center' }
			}
		],
		[extraTvlsEnabled]
	)

	const { totalValue, topProtocol, tableData, dataset, charts } = useMemo(() => {
		const tableData =
			enabledExtraApiKeys.length === 0
				? protocolTableData
				: protocolTableData
						.map((protocol) => {
							const extraValues: Record<string, number> = {}
							for (const [extraKey, extraData] of Object.entries(protocol.chainTvls ?? {})) {
								extraValues[extraKey] = extraData?.tvl ?? 0
							}

							const protocolTvl = calculateTvlWithExtraToggles({
								values: { tvl: protocol.tvl, ...extraValues },
								extraTvlsEnabled
							})

							return {
								...protocol,
								tvl: protocolTvl
							}
						})
						.sort((a, b) => b.tvl - a.tvl)
		const topProtocol = tableData[0] ?? null

		const dataset = {
			source: chartData.map(([timestampInSeconds, baseValue]) => {
				const extraValue = enabledExtraApiKeys.length > 0 ? (extraTvsByTimestamp.get(timestampInSeconds) ?? 0) : 0
				return {
					timestamp: timestampInSeconds * 1000,
					TVL: baseValue + extraValue
				}
			}),
			dimensions: ['timestamp', 'TVL']
		}
		const totalValue = dataset.source.length > 0 ? dataset.source[dataset.source.length - 1].TVL : 0

		const charts = [
			{
				type: 'line' as const,
				name: 'TVL',
				encode: { x: 'timestamp', y: 'TVL' },
				color: CHART_COLORS[0],
				stack: 'TVL'
			}
		]

		return { totalValue, topProtocol, tableData, dataset, charts }
	}, [chartData, enabledExtraApiKeys.length, extraTvsByTimestamp, extraTvlsEnabled, protocolTableData])

	const dominance = topProtocol ? getTokenDominance({ tvl: topProtocol.tvl }, totalValue) : null
	const dominanceText = dominance == null ? null : String(dominance)

	const isLoading = enabledExtraApiKeys.length > 0 && isFetchingExtraSeries
	return (
		<>
			<RowLinksWithDropdown links={forkLinks} activeLink={fork} alternativeOthersText="Others" />
			{isLoading ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<p className="flex items-center gap-1">
						Loading
						<LoadingDots />
					</p>
				</div>
			) : (
				<>
					<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
						<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
							<h1 className="text-xl font-semibold">{fork}</h1>
							<p className="flex flex-col">
								<span className="text-(--text-label)">TVL in Forks (USD)</span>
								<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalValue, true)}</span>
							</p>
							<p className="flex flex-col">
								<span className="text-(--text-label)">{topProtocol?.name ?? 'Top Protocol'} Dominance</span>
								<span className="font-jetbrains text-2xl font-semibold">
									{dominanceText == null ? 'N/A' : `${dominanceText}%`}
								</span>
							</p>
						</div>

						<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<Suspense fallback={<div className="min-h-[398px]" />}>
								<MultiSeriesChart2
									dataset={dataset}
									charts={charts}
									alwaysShowTooltip
									exportButtons={{ png: true, csv: true }}
								/>
							</Suspense>
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
			)}
		</>
	)
}
