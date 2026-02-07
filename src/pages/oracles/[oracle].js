// import { lazy, Suspense, useMemo } from 'react'
// import { maxAgeForNext } from '~/api'
// import { tvlOptions } from '~/components/Filters/options'
// import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
// import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
// import { protocolsOracleColumns } from '~/components/Table/Defi/Protocols/columns'
// import { CHART_COLORS } from '~/constants/colors'
// import { getOraclePageData } from '~/containers/Oracles/queries'
// import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
// import { formatChartTvlsByDay } from '~/hooks/data'
// import { formatDataWithExtraTvls } from '~/hooks/data/defi'
// import Layout from '~/layout'
// import { formattedNum, getTokenDominance } from '~/utils'
// import { withPerformanceLogging } from '~/utils/perf'

// const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

// export const getStaticProps = withPerformanceLogging('oracles/[oracle]', async ({ params }) => {
// 	if (!params?.oracle) {
// 		return { notFound: true, props: null }
// 	}

// 	const oracle = params.oracle
// 	const data = await getOraclePageData(oracle)

// 	if (!data) {
// 		return { notFound: true }
// 	}

// 	return {
// 		props: { ...data },
// 		revalidate: maxAgeForNext([22])
// 	}
// })

// export async function getStaticPaths() {
// 	const { oracles = {} } = await getOraclePageData()

// 	const paths = []
// 	let i = 0
// 	for (const oracle in oracles) {
// 		if (i >= 10) break
// 		paths.push({ params: { oracle } })
// 		i++
// 	}

// 	return { paths, fallback: 'blocking' }
// }

// const PageView = ({ chartData, tokenLinks, token, filteredProtocols, chain, chainChartData }) => {
// 	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
// 	const { protocolsData, dataset, charts, totalValue } = useMemo(() => {
// 		const dataWithTvs = formatDataWithExtraTvls({
// 			data: filteredProtocols,
// 			extraTvlsEnabled
// 		})

// 		const protocolsData = dataWithTvs.map((p) => ({
// 			...p,
// 			tvs: p.tvs ?? p.tvl ?? 0
// 		}))

// 		const finalChartData = formatChartTvlsByDay({ data: chainChartData || chartData, extraTvlsEnabled, key: 'TVS' })

// 		const totalValue = finalChartData[finalChartData.length - 1][1]

// 		return {
// 			protocolsData,
// 			dataset: {
// 				source: finalChartData.map(([timestamp, value]) => ({ timestamp, TVS: value })),
// 				dimensions: ['timestamp', 'TVS']
// 			},
// 			charts: [
// 				{
// 					type: 'line',
// 					name: 'TVS',
// 					encode: { x: 'timestamp', y: 'TVS' },
// 					color: CHART_COLORS[0],
// 					stack: 'TVS'
// 				}
// 			],
// 			totalValue
// 		}
// 	}, [chainChartData, chartData, extraTvlsEnabled, filteredProtocols])

// 	const topToken = {}

// 	if (protocolsData.length > 0) {
// 		topToken.name = protocolsData[0]?.name
// 		topToken.tvl = protocolsData[0]?.tvs
// 	}

// 	const dominance = getTokenDominance(topToken, totalValue)

// 	return (
// 		<>
// 			<RowLinksWithDropdown links={tokenLinks} activeLink={chain ?? 'All'} />

// 			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
// 				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
// 					<h1 className="text-xl font-semibold">{token}</h1>
// 					<p className="flex flex-col">
// 						<span className="text-(--text-label)">Total Value Secured (USD)</span>
// 						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalValue, true)}</span>
// 					</p>
// 					<p className="flex flex-col">
// 						<span className="text-(--text-label)">{topToken.name} Dominance</span>
// 						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
// 					</p>
// 				</div>

// 				<div className="col-span-2 min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
// 					<Suspense fallback={<div className="min-h-[408px]" />}>
// 						<MultiSeriesChart2
// 							dataset={dataset}
// 							charts={charts}
// 							alwaysShowTooltip
// 							shouldEnableImageExport
// 							shouldEnableCSVDownload
// 						/>
// 					</Suspense>
// 				</div>
// 			</div>

// 			<ProtocolsTableWithSearch data={protocolsData} columns={protocolsOracleColumns} />
// 		</>
// 	)
// }

// const pageName = ['Protocols TVS', 'by', 'Oracle']
// export default function Oracles(props) {
// 	return (
// 		<Layout
// 			title={`Oracles - DefiLlama`}
// 			description={`Total Value Secured by Oracles. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
// 			keywords={`blockchain oracles , total value secured by oracles, defi total value secured by oracles`}
// 			canonicalUrl={`/oracles/${props.oracle}`}
// 			metricFilters={tvlOptions}
// 			pageName={pageName}
// 		>
// 			<PageView {...props} />
// 		</Layout>
// 	)
// }

import { BasicLink } from '~/components/Link'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'

export default function OraclesOraclePage() {
	return (
		<TemporarilyDisabledPage
			title="Oracles temporarily disabled - DefiLlama"
			description="Oracles dashboards are temporarily disabled and will be back shortly."
			canonicalUrl="/oracles"
		>
			<p>The Oracles dashboards are temporarily disabled while we perform maintenance. We&apos;ll be back shortly.</p>
			<p>
				In the meantime, check out{' '}
				<BasicLink href="/metrics" className="underline">
					other dashboards
				</BasicLink>
				.
			</p>
		</TemporarilyDisabledPage>
	)
}
