import { lazy, Suspense, useMemo } from 'react'
import Layout from '~/layout'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formattedNum, getTokenDominance } from '~/utils'
import { maxAgeForNext } from '~/api'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'
import { getOraclePageData } from '~/containers/Oracles/queries'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { oldBlue } from '~/constants/colors'
import { protocolsOracleColumns } from '~/components/Table/Defi/Protocols/columns'

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
					color: oldBlue
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
			<ProtocolsChainsSearch />

			<RowLinksWithDropdown links={tokenLinks} activeLink={chain ?? 'All'} />

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<h1 className="text-xl font-semibold">{token}</h1>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Value Secured (USD)</span>
						<span className="font-semibold text-2xl font-jetbrains">{formattedNum(totalValue, true)}</span>
					</p>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">{topToken.name} Dominance</span>
						<span className="font-semibold text-2xl font-jetbrains">{dominance}%</span>
					</p>
				</div>

				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col col-span-2 min-h-[370px] pt-2">
					<Suspense fallback={<></>}>
						<LineAndBarChart charts={charts} alwaysShowTooltip />
					</Suspense>
				</div>
			</div>

			<ProtocolsTableWithSearch data={protocolsData} columns={protocolsOracleColumns} />
		</>
	)
}

export default function Oracles(props) {
	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
