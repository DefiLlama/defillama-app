import { lazy, Suspense, useMemo } from 'react'
import { LoadingDots } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TokenLogo } from '~/components/TokenLogo'
import { CHART_COLORS } from '~/constants/colors'
import { ChainProtocolsTable } from '~/containers/ChainOverview/Table'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, getTokenDominance, tokenIconUrl } from '~/utils'
import { useForkByProtocolExtraSeries } from './queries.client'
import { getEnabledExtraApiKeys } from './tvl'
import type { ForkByProtocolPageData } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

export const ForksByProtocol = ({ fork, forkLinks, protocolTableData, chartData }: ForkByProtocolPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const enabledExtraApiKeys = useMemo(() => getEnabledExtraApiKeys(extraTvlsEnabled), [extraTvlsEnabled])
	const { isFetchingExtraSeries, extraTvsByTimestamp } = useForkByProtocolExtraSeries({
		enabledExtraApiKeys,
		protocol: fork
	})

	const { totalValue, topProtocol, dataset, charts } = useMemo(() => {
		const topProtocol = protocolTableData[0] ?? null
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

		return { totalValue, topProtocol, dataset, charts }
	}, [chartData, enabledExtraApiKeys.length, extraTvsByTimestamp, protocolTableData])

	const dominance = topProtocol ? getTokenDominance({ tvl: topProtocol.tvl?.default?.tvl ?? 0 }, totalValue) : null
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
							<h1 className="flex items-center gap-2 text-xl font-semibold">
								<TokenLogo logo={tokenIconUrl(fork)} size={24} />
								{fork}
							</h1>
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
								style={{ minHeight: `${protocolTableData.length * 50 + 200}px` }}
								className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
							/>
						}
					>
						<ChainProtocolsTable protocols={protocolTableData} useStickyHeader={false} />
					</Suspense>
				</>
			)}
		</>
	)
}
