import { lazy, Suspense, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { maxAgeForNext } from '~/api'
import { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'
import { LocalLoader } from '~/components/Loaders'
import { PROTOCOL_TREASURY_API } from '~/constants'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import { buildProtocolAddlChartsData, getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { preparePieChartData, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export const getStaticProps = withPerformanceLogging(
	'protocol/treasury[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].treasury) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData)
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	const [includeOwnTokens, setIncludeOwnTokens] = useState(true)
	const { data, isLoading } = useQuery({
		queryKey: ['treasury', props.name],
		queryFn: () => fetchJson(`${PROTOCOL_TREASURY_API}/${props.name}`),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury } = useMemo(() => {
		const chartData = {}
		const allLatestTokensInUsd = {}
		for (const chain in data?.chainTvls ?? {}) {
			if (chain.includes('-')) continue
			if (!includeOwnTokens && chain.endsWith('OwnTokens')) continue
			chartData[chain] = data.chainTvls[chain]
			const latestTokensInUsd = data.chainTvls[chain].tokensInUsd.slice(-1)[0].tokens
			for (const token in latestTokensInUsd) {
				allLatestTokensInUsd[token] = (allLatestTokensInUsd[token] || 0) + latestTokensInUsd[token]
			}
		}

		const top10Tokens = preparePieChartData({
			data: allLatestTokensInUsd,
			limit: 9
		})

		const { tokenBreakdown, tokenBreakdownUSD, tokensUnique } = buildProtocolAddlChartsData({
			protocolData: { name: props.name, chainTvls: chartData },
			extraTvlsEnabled: {}
		})

		const historicalTreasury = {}
		for (const chain in chartData) {
			for (const { date, totalLiquidityUSD } of chartData[chain].tvl) {
				historicalTreasury[date] = (historicalTreasury[date] || 0) + totalLiquidityUSD
			}
		}

		const finalHistoricalTreasury = []
		for (const date in historicalTreasury) {
			finalHistoricalTreasury.push([date, historicalTreasury[date]])
		}

		return { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury: finalHistoricalTreasury }
	}, [data, includeOwnTokens, props.name])
	const protocolSlug = slug(props.name || 'protocol')
	const buildFilename = (suffix: string) => `${protocolSlug}-${slug(suffix)}`
	const buildTitle = (suffix: string) => (props.name ? `${props.name} – ${suffix}` : suffix)

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="treasury"
			warningBanners={props.warningBanners}
			toggleOptions={[]}
		>
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<h2 className="group relative flex items-center gap-1 text-base font-semibold" id="treasury">
					Treasury for {props.name}
				</h2>
				<label className="cursor-pointe ml-auto flex flex-nowrap items-center justify-end gap-2">
					<input type="checkbox" checked={includeOwnTokens} onChange={() => setIncludeOwnTokens(!includeOwnTokens)} />
					<span>Include own tokens</span>
				</label>
			</div>
			{isLoading ? (
				<div className="flex min-h-[384px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : (
				<div className="grid min-h-[384px] grid-cols-2 gap-2 rounded-md">
					<LazyChart className="relative col-span-full flex min-h-[368px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<PieChart chartData={top10Tokens} />
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full flex min-h-[368px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart
								chartData={historicalTreasury}
								title="Historical Treasury"
								valueSymbol="$"
								enableImageExport
								imageExportFilename={buildFilename('historical-treasury')}
								imageExportTitle={buildTitle('Historical Treasury')}
							/>
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full flex min-h-[368px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart
								chartData={tokenBreakdown}
								title="Tokens Breakdown"
								stacks={tokensUnique}
								enableImageExport
								imageExportFilename={buildFilename('tokens-breakdown')}
								imageExportTitle={buildTitle('Tokens Breakdown')}
							/>
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full flex min-h-[368px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart
								chartData={tokenBreakdownUSD}
								title="Tokens (USD)"
								stacks={tokensUnique}
								valueSymbol="$"
								enableImageExport
								imageExportFilename={buildFilename('tokens-usd')}
								imageExportTitle={buildTitle('Tokens (USD)')}
							/>
						</Suspense>
					</LazyChart>
				</div>
			)}
		</ProtocolOverviewLayout>
	)
}
