import { useQuery } from '@tanstack/react-query'
import type { GetStaticPropsContext } from 'next'
import { useRouter } from 'next/router'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { TokenLogo } from '~/components/TokenLogo'
import {
	fetchProtocolOverviewMetrics,
	fetchProtocolTreasuryTokenBreakdownChart
} from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import type { IProtocolPageMetrics } from '~/containers/ProtocolOverview/types'
import { useProtocolBreakdownCharts } from '~/containers/ProtocolOverview/useProtocolBreakdownCharts'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug, tokenIconUrl } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_TOGGLE_OPTIONS = []

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>

interface TreasuryPageProps {
	name: string
	otherProtocols: string[]
	category: string | null
	metrics: IProtocolPageMetrics
	warningBanners: ReturnType<typeof getProtocolWarningBanners>
}

function updateSelectionOnListChange(selected: string[], all: string[]) {
	if (all.length === 0) return []
	if (selected.length === 0) return all
	const next = selected.filter((x) => all.includes(x))
	return next.length > 0 ? next : all
}

function TokensBreakdownPieChartCard({
	protocolName,
	chartData
}: {
	protocolName: string
	chartData: Array<{ name: string; value: number }>
}) {
	const allTokens = React.useMemo(() => chartData.map((d) => d.name), [chartData])
	const [selectedTokensRaw, setSelectedTokensRaw] = React.useState<string[]>(() => allTokens)
	const selectedTokens = React.useMemo(
		() => updateSelectionOnListChange(selectedTokensRaw, allTokens),
		[selectedTokensRaw, allTokens]
	)

	const selectedTokensSet = React.useMemo(() => new Set(selectedTokens), [selectedTokens])
	const filteredChartData = React.useMemo(() => {
		if (selectedTokens.length === 0) return []
		return chartData.filter((d) => selectedTokensSet.has(d.name))
	}, [chartData, selectedTokens.length, selectedTokensSet])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-treasury-tokens-breakdown`
	const exportTitle = `${protocolName} Treasury Tokens Breakdown`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Tokens Breakdown</h1>
				{allTokens.length > 1 ? (
					<SelectWithCombobox
						allValues={allTokens}
						selectedValues={selectedTokens}
						setSelectedValues={setSelectedTokensRaw}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<PieChart chartData={filteredChartData} onReady={handleChartReady} />
			</React.Suspense>
		</div>
	)
}

function HistoricalTreasuryChartCard({
	protocolName,
	dataset,
	charts
}: {
	protocolName: string
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
}) {
	const allSeries = React.useMemo(() => ['Treasury'], [])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-historical-treasury`
	const exportTitle = `${protocolName} Historical Treasury`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Historical Treasury</h1>
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					valueSymbol="$"
					selectedCharts={new Set(allSeries)}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function TokensMultiSeriesChartCard({
	title,
	protocolName,
	allTokens,
	dataset,
	charts,
	exportSuffix,
	valueSymbol
}: {
	title: string
	protocolName: string
	allTokens: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
	exportSuffix: string
	valueSymbol?: string
}) {
	const [selectedTokensRaw, setSelectedTokensRaw] = React.useState<string[]>(() => allTokens)
	const selectedTokens = React.useMemo(
		() => updateSelectionOnListChange(selectedTokensRaw, allTokens),
		[selectedTokensRaw, allTokens]
	)

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-${slug(exportSuffix)}`
	const exportTitle = `${protocolName} ${title}`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
				{allTokens.length > 1 ? (
					<SelectWithCombobox
						allValues={allTokens}
						selectedValues={selectedTokens}
						setSelectedValues={setSelectedTokensRaw}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					{...(valueSymbol !== undefined ? { valueSymbol } : {})}
					selectedCharts={new Set(selectedTokens)}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

export const getStaticProps = withPerformanceLogging(
	'protocol/treasury[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
		}
		const { protocol } = params
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

		const protocolData = await fetchProtocolOverviewMetrics(protocol)

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })

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

export default function Protocols(props: TreasuryPageProps) {
	const router = useRouter()
	const protocol = slug(props.name ?? '')

	// includeOwnTokens is off by default and only enabled via URL query.
	// Read query params only when router is ready to avoid hydration mismatch.
	const includeOwnTokens = router.isReady && router.query.includeOwnTokens === 'true'

	const extraKeys = React.useMemo(() => (includeOwnTokens ? ['OwnTokens'] : []), [includeOwnTokens])

	const {
		isLoading,
		valueDataset,
		valueCharts,
		tokensUnique,
		tokenUSDDataset,
		tokenUSDCharts,
		tokenRawDataset,
		tokenRawCharts,
		tokenBreakdownPieChart
	} = useProtocolBreakdownCharts({
		protocol,
		keys: extraKeys,
		includeBase: true,
		source: 'treasury',
		inflows: props.metrics?.inflows
	})

	const { data: ownTokensBreakdown } = useQuery({
		queryKey: ['protocolTreasuryOwnTokensAvailable', protocol],
		queryFn: () => fetchProtocolTreasuryTokenBreakdownChart({ protocol, key: 'OwnTokens' }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0,
		enabled: !!protocol
	})

	const hasOwnTokens = (ownTokensBreakdown?.length ?? 0) > 0
	const hasBreakdownMetrics =
		(tokenBreakdownPieChart?.length ?? 0) > 0 ||
		!!valueDataset ||
		(tokenRawDataset && tokensUnique.length > 0) ||
		(tokenUSDDataset && tokensUnique.length > 0)

	const toggleIncludeOwnTokens = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const nextIncludeOwnTokens = event.currentTarget.checked
			const { includeOwnTokens: _inc, ...restQuery } = router.query
			const nextQuery = nextIncludeOwnTokens ? { ...restQuery, includeOwnTokens: 'true' } : restQuery
			router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
		},
		[router]
	)

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="treasury"
			warningBanners={props.warningBanners}
			toggleOptions={EMPTY_TOGGLE_OPTIONS}
		>
			<div className="col-span-full flex flex-wrap items-center justify-end gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<div className="mr-auto flex items-center gap-2">
					<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
					<h1 className="text-xl font-bold">{props.name} Treasury</h1>
				</div>
				{hasOwnTokens ? (
					<Switch
						value="includeOwnTokens"
						label="Include own tokens"
						checked={includeOwnTokens}
						onChange={toggleIncludeOwnTokens}
						className="ml-auto gap-2"
					/>
				) : null}
			</div>
			{isLoading ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<LocalLoader />
				</div>
			) : !hasBreakdownMetrics ? (
				<div className="col-span-full flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<p className="text-(--text-label)">Breakdown metrics are not available</p>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-2">
					{tokenBreakdownPieChart?.length ? (
						<TokensBreakdownPieChartCard
							key={tokenBreakdownPieChart.map((d) => d.name).join('|')}
							protocolName={props.name}
							chartData={tokenBreakdownPieChart}
						/>
					) : null}

					{valueDataset ? (
						<HistoricalTreasuryChartCard
							key="historical-treasury"
							protocolName={props.name}
							dataset={valueDataset}
							charts={valueCharts}
						/>
					) : null}

					{tokenRawDataset && tokensUnique.length > 0 ? (
						<TokensMultiSeriesChartCard
							key={`${tokensUnique.join('|')}:treasury-tokens-breakdown-raw`}
							title="Tokens Breakdown"
							protocolName={props.name}
							allTokens={tokensUnique}
							dataset={tokenRawDataset}
							charts={tokenRawCharts}
							exportSuffix="treasury-tokens-breakdown-raw"
							valueSymbol=""
						/>
					) : null}

					{tokenUSDDataset && tokensUnique.length > 0 ? (
						<TokensMultiSeriesChartCard
							key={`${tokensUnique.join('|')}:treasury-tokens-usd`}
							title="Tokens (USD)"
							protocolName={props.name}
							allTokens={tokensUnique}
							dataset={tokenUSDDataset}
							charts={tokenUSDCharts}
							exportSuffix="treasury-tokens-usd"
							valueSymbol="$"
						/>
					) : null}
				</div>
			)}
		</ProtocolOverviewLayout>
	)
}
