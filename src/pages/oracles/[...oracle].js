import { lazy, Suspense, useMemo } from 'react'
import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import { protocolsOracleColumns } from '~/components/Table/Defi/Protocols/columns'
import { CHART_COLORS } from '~/constants/colors'
import { getOraclePageData } from '~/containers/Oracles/queries'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import Layout from '~/layout'
import { formattedNum, getTokenDominance } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart'))

export const getStaticProps = withPerformanceLogging(
	'oracles/[...oracle]',
	async ({
		params: {
			oracle: [oracle, chain]
		}
	}) => {
		const data = await getOraclePageData(oracle, chain)

		if (!data) {
			return { notFound: true }
		}

		return {
			props: { ...data },
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const { oracles = {} } = await getOraclePageData()

	const oraclesList = Object.keys(oracles)

	const paths = oraclesList.slice(0, 10).map((oracle) => {
		return {
			params: { oracle }
		}
	})

	return { paths, fallback: 'blocking' }
}

const PageView = ({ chartData, tokenLinks, token, filteredProtocols, chain, chainChartData }) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const { protocolsData, charts, totalValue } = useMemo(() => {
		const dataWithTvs = formatDataWithExtraTvls({
			data: filteredProtocols,
			extraTvlsEnabled
		})

		const protocolsData = dataWithTvs.map((p) => ({
			...p,
			tvs: p.tvs ?? p.tvl ?? 0
		}))

		const finalChartData = formatChartTvlsByDay({ data: chainChartData || chartData, extraTvlsEnabled, key: 'TVS' })

		const totalValue = finalChartData[finalChartData.length - 1][1]

		return {
			protocolsData,
			charts: {
				TVS: {
					name: 'TVS',
					type: 'line',
					stack: 'TVS',
					data: finalChartData,
					color: CHART_COLORS[0]
				}
			},
			totalValue
		}
	}, [chainChartData, chartData, extraTvlsEnabled, filteredProtocols])

	const topToken = {}

	if (protocolsData.length > 0) {
		topToken.name = protocolsData[0]?.name
		topToken.tvl = protocolsData[0]?.tvs
	}

	const dominance = getTokenDominance(topToken, totalValue)

	return (
		<>
			<RowLinksWithDropdown links={tokenLinks} activeLink={chain ?? 'All'} />

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">{token}</h1>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Secured (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{formattedNum(totalValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">{topToken.name} Dominance</span>
						<span className="font-jetbrains text-2xl font-semibold">{dominance}%</span>
					</p>
				</div>

				<div className="col-span-2 min-h-[370px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<Suspense fallback={<></>}>
						<LineAndBarChart charts={charts} alwaysShowTooltip />
					</Suspense>
				</div>
			</div>

			<ProtocolsTableWithSearch data={protocolsData} columns={protocolsOracleColumns} />
		</>
	)
}

const pageName = ['Protocols TVS', 'by', 'Oracle']
export default function Oracles(props) {
	return (
		<Layout
			title={`Oracles - DefiLlama`}
			description={`Total Value Secured by Oracles. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`blockchain oracles , total value secured by oracles, defi total value secured by oracles`}
			canonicalUrl={`/oracles/${props.oracle}`}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<PageView {...props} />
		</Layout>
	)
}
