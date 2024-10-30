/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetStaticProps, GetStaticPaths } from 'next'
import * as React from 'react'
import Layout from '~/layout'
import { LiquidationsSearch } from '~/components/Search/Liquidations'
import SEO from '~/components/SEO'
import { LiquidationsHeader } from '~/containers/LiquidationsPage/LiquidationsHeader'
import { LiquidationsContent } from '~/containers/LiquidationsPage/LiquidationsContent'
import { ProtocolsTable } from '~/containers/LiquidationsPage/ProtocolsTable'
import { TableSwitch } from '~/containers/LiquidationsPage/TableSwitch'
import { PositionsTable, SmolHints } from '~/containers/LiquidationsPage/PositionsTable'
import { LIQS_SETTINGS, useLiqsManager } from '~/contexts/LocalStorage'
import type { ISearchItem } from '~/components/Search/types'
import { maxAgeForNext } from '~/api'
import { liquidationsIconUrl } from '~/utils'
import {
	ChartData,
	getAvailableAssetsList,
	getLatestChartData,
	getPrevChartData,
	getReadableValue
} from '~/utils/liquidations'
import { LiquidationsContext } from '~/containers/LiquidationsPage/context'
import { withPerformanceLogging } from '~/utils/perf'
import { Icon } from '~/components/Icon'

export const getStaticProps: GetStaticProps<{ data: ChartData; prevData: ChartData }> = withPerformanceLogging(
	'liquidations/[symbol]',
	async ({ params }) => {
		const symbol = (params.symbol as string).toLowerCase()
		const { assets: options } = await getAvailableAssetsList()
		const data = await getLatestChartData(symbol, 100)
		const prevData = (await getPrevChartData(symbol, 100, 3600 * 24)) ?? data
		return {
			props: { data, prevData, options },
			revalidate: maxAgeForNext([5, 25, 45])
		}
	}
)

export const getStaticPaths: GetStaticPaths = async () => {
	const { assets } = await getAvailableAssetsList()
	const paths = assets
		.map((x) => (x.route as string).split('/').pop())
		.map((x) => ({
			params: { symbol: x.toLowerCase() }
		}))

	return { paths: paths.slice(0, 5), fallback: 'blocking' }
}

const LiquidationsProvider = ({ children }) => {
	const [selectedSeries, setSelectedSeries] = React.useState<{ [key: string]: boolean }>({})

	return (
		<LiquidationsContext.Provider value={{ selectedSeries, setSelectedSeries }}>
			{children}
		</LiquidationsContext.Provider>
	)
}

const LiquidationsHomePage: NextPage<{ data: ChartData; prevData: ChartData; options: ISearchItem[] }> = (props) => {
	const { data, prevData, options } = props
	const [liqsSettings] = useLiqsManager()
	const { LIQS_SHOWING_INSPECTOR } = LIQS_SETTINGS
	const isLiqsShowingInspector = liqsSettings[LIQS_SHOWING_INSPECTOR]

	const [minutesAgo, setMinutesAgo] = React.useState(Math.round((Date.now() - data?.time * 1000) / 1000 / 60))

	React.useEffect(() => {
		const interval = setInterval(() => {
			setMinutesAgo((x) => x + 1)
		}, 1000 * 60)
		return () => clearInterval(interval)
	}, [])

	return (
		<Layout title={`${data.name} (${data.symbol.toUpperCase()}) Liquidation Levels - DefiLlama`}>
			<SEO
				liqsPage
				cardName={`${data.name} (${data.symbol.toUpperCase()})`}
				logo={'https://defillama.com' + liquidationsIconUrl(data.symbol.toLowerCase(), true)}
				tvl={'$' + getReadableValue(data.totalLiquidable)}
			/>

			<LiquidationsSearch
				step={{ category: 'Home', name: `${data.symbol.toUpperCase()} Liquidation Levels`, hideOptions: true }}
			/>

			{/* {!['BNB', 'CAKE', 'SXP', 'BETH', 'ADA'].includes(data.symbol.toUpperCase()) && (
				<>
					<PanelThicc as="p">
						We are now tracking
						<Link href={`/liquidations/bnb`} className="flex items-center gap-1">
								<Image src={`/asset-icons/bnb.png`} width={24} height={24} alt={'BNB'} style={{ borderRadius: 12 }} />
								<span>BSC</span>
						</Link>
						ecosystem assets! Choose one from the asset picker dropdown menu!
					</PanelThicc>
					<PanelSmol as="p">
						We are now tracking
						<Link href={`/liquidations/bnb`} className="flex items-center gap-1">
								<Image src={`/asset-icons/bnb.png`} width={24} height={24} alt={'BNB'} style={{ borderRadius: 12 }} />
								<span>BSC</span>
						</Link>
						!
					</PanelSmol>
				</>
			)} */}

			<h1 className="text-2xl font-medium -mb-5 text-center xl:text-start">Liquidation levels in DeFi 💦</h1>
			<LiquidationsHeader data={data} options={options} />
			<LiquidationsProvider>
				<LiquidationsContent data={data} prevData={prevData} />
			</LiquidationsProvider>
			<SmolHints>
				<Icon name="clock" height={12} width={13} />
				<i>Last updated {minutesAgo}min ago</i>
			</SmolHints>
			<TableSwitch />
			{isLiqsShowingInspector && <PositionsTable data={data} prevData={prevData} />}
			{!isLiqsShowingInspector && <ProtocolsTable data={data} prevData={prevData} />}
		</Layout>
	)
}

export default LiquidationsHomePage
