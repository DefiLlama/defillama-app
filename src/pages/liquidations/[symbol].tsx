/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetStaticProps, GetStaticPaths } from 'next'
import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styled from 'styled-components'
import { Clock } from 'react-feather'
import Layout from '~/layout'
import { Header } from '~/Theme'
import { PanelSmol, PanelThicc, StyledAnchor } from '~/components'
import { LiquidationsSearch } from '~/components/Search'
import SEO from '~/components/SEO'
import { LiquidationsHeader } from '~/components/LiquidationsPage/LiquidationsHeader'
import { LiquidationsContent } from '~/components/LiquidationsPage/LiquidationsContent'
import { ProtocolsTable } from '~/components/LiquidationsPage/ProtocolsTable'
import { TableSwitch } from '~/components/LiquidationsPage/TableSwitch'
import { PositionsTable, SmolHints } from '~/components/LiquidationsPage/PositionsTable'
import { LIQS_SETTINGS, useLiqsManager } from '~/contexts/LocalStorage'
import type { ISearchItem } from '~/components/Search/types'
import { revalidate } from '~/api'
import { assetIconUrl } from '~/utils'
import {
	ChartData,
	getAvailableAssetsList,
	getLatestChartData,
	getPrevChartData,
	getReadableValue
} from '~/utils/liquidations'
import { LiquidationsContext } from '~/components/LiquidationsPage/context'

export const getStaticProps: GetStaticProps<{ data: ChartData; prevData: ChartData }> = async ({ params }) => {
	const symbol = (params.symbol as string).toLowerCase()
	const { assets: options } = await getAvailableAssetsList()
	const data = await getLatestChartData(symbol, 100)
	const prevData = (await getPrevChartData(symbol, 100, 3600 * 24)) ?? data
	return {
		props: { data, prevData, options },
		revalidate: revalidate(5)
	}
}

export const getStaticPaths: GetStaticPaths = async () => {
	const { assets } = await getAvailableAssetsList()
	const paths = assets
		.map((x) => (x.route as string).split('/').pop())
		.map((x) => ({
			params: { symbol: x.toLowerCase() }
		}))
	return { paths, fallback: 'blocking' }
}

const LiquidationsProvider = ({ children }) => {
	const [selectedSeries, setSelectedSeries] = React.useState<{ [key: string]: boolean }>({})

	return (
		<LiquidationsContext.Provider value={{ selectedSeries, setSelectedSeries }}>
			{children}
		</LiquidationsContext.Provider>
	)
}

const ResponsiveHeader = styled(Header)`
	text-align: center;
	@media (min-width: 80rem) {
		text-align: revert;
	}
`

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
				logo={'https://defillama.com' + assetIconUrl(data.symbol.toLowerCase(), true)}
				tvl={'$' + getReadableValue(data.totalLiquidable)}
			/>

			<LiquidationsSearch
				step={{ category: 'Home', name: `${data.symbol.toUpperCase()} Liquidation Levels`, hideOptions: true }}
			/>

			{/* {!['BNB', 'CAKE', 'SXP', 'BETH', 'ADA'].includes(data.symbol.toUpperCase()) && (
				<>
					<PanelThicc as="p">
						We are now tracking
						<Link href={`/liquidations/bnb`} passHref>
							<StyledAnchor>
								<Image src={`/asset-icons/bnb.png`} width={24} height={24} alt={'BNB'} style={{ borderRadius: 12 }} />
								<b>BSC</b>
							</StyledAnchor>
						</Link>
						ecosystem assets! Choose one from the asset picker dropdown menu!
					</PanelThicc>
					<PanelSmol as="p">
						We are now tracking
						<Link href={`/liquidations/bnb`} passHref>
							<StyledAnchor>
								<Image src={`/asset-icons/bnb.png`} width={24} height={24} alt={'BNB'} style={{ borderRadius: 12 }} />
								<b>BSC</b>
							</StyledAnchor>
						</Link>
						!
					</PanelSmol>
				</>
			)} */}

			<ResponsiveHeader>Liquidation levels in DeFi 💦</ResponsiveHeader>
			<LiquidationsHeader data={data} options={options} />
			<LiquidationsProvider>
				<LiquidationsContent data={data} prevData={prevData} />
			</LiquidationsProvider>
			<SmolHints>
				<Clock size={12} />
				<i>Last updated {minutesAgo}min ago</i>
			</SmolHints>
			<TableSwitch />
			{isLiqsShowingInspector && <PositionsTable data={data} prevData={prevData} />}
			{!isLiqsShowingInspector && <ProtocolsTable data={data} prevData={prevData} />}
		</Layout>
	)
}

export default LiquidationsHomePage
