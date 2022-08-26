/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetStaticProps, GetStaticPaths } from 'next'
import { revalidate } from '~/api'
import {
	ChartData,
	DEFAULT_ASSETS_LIST,
	getLatestChartData,
	getPrevChartData,
	getReadableValue
} from '~/utils/liquidations'
import Link from 'next/link'

import Layout from '~/layout'
import { LiquidationsSearch } from '~/components/Search'
import { Header } from '~/Theme'
import { LiquidationsHeader } from '../../components/LiquidationsPage/LiquidationsHeader'
import { LiquidationsContent } from '../../components/LiquidationsPage/LiquidationsContent'
import styled from 'styled-components'
import React, { useEffect, useState } from 'react'
import { Clock } from 'react-feather'
import { LiquidationsTable } from '../../components/LiquidationsPage/LiquidationsTable'
import SEO from '~/components/SEO'
import { assetIconUrl } from '~/utils'
import { Panel } from '~/components'
import TokenLogo from '~/components/TokenLogo'
import Image from 'next/image'

export const getStaticProps: GetStaticProps<{ data: ChartData; prevData: ChartData }> = async ({ params }) => {
	const symbol = (params.symbol as string).toLowerCase()
	const data = await getLatestChartData(symbol, 100)
	const prevData = (await getPrevChartData(symbol, 100, 3600 * 24)) ?? data
	return {
		props: { data, prevData },
		revalidate: revalidate(5)
	}
}

export const getStaticPaths: GetStaticPaths = async () => {
	// TODO: make api for all tracked symbols
	const paths = DEFAULT_ASSETS_LIST.map((x) => x.route.split('/').pop()).map((x) => ({
		params: { symbol: x.toLowerCase() }
	}))
	return { paths, fallback: 'blocking' }
}

export const LiquidationsContext = React.createContext<{
	selectedSeries: {
		[key: string]: boolean
	}
	setSelectedSeries: React.Dispatch<
		React.SetStateAction<{
			[key: string]: boolean
		}>
	>
}>(null)

const LiquidationsProvider = ({ children }) => {
	const [selectedSeries, setSelectedSeries] = useState<{ [key: string]: boolean }>({})

	return (
		<LiquidationsContext.Provider value={{ selectedSeries, setSelectedSeries }}>
			{children}
		</LiquidationsContext.Provider>
	)
}

const PanelThicc = styled(Panel)`
	display: none;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	text-align: center;

	@media (min-width: 80rem) {
		display: flex;
	}
`

const PanelSmol = styled(Panel)`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	text-align: center;

	@media (min-width: 80rem) {
		display: none;
	}
`

const StyledAnchor = styled.a`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 0.2rem;
	margin-left: 0.2rem;
	:hover {
		text-decoration: underline;
	}

	@media (min-width: 80rem) {
		margin-right: 0.2rem;
	}
`

const LiquidationsHomePage: NextPage<{ data: ChartData; prevData: ChartData }> = (props) => {
	const { data, prevData } = props
	const asset = DEFAULT_ASSETS_LIST.find((x) => x.symbol.toLowerCase() === data.symbol.toLowerCase())

	const [minutesAgo, setMinutesAgo] = useState(Math.round((Date.now() - data.time * 1000) / 1000 / 60))
	useEffect(() => {
		const interval = setInterval(() => {
			setMinutesAgo((x) => x + 1)
		}, 1000 * 60)
		return () => clearInterval(interval)
	}, [])

	return (
		<Layout title={`${asset?.name} (${asset?.symbol}) Liquidation Levels - DefiLlama`}>
			<SEO
				liqsPage
				cardName={`${asset?.name} (${asset?.symbol})`}
				logo={'https://defillama.com' + assetIconUrl(asset?.symbol, true)}
				tvl={'$' + getReadableValue(data.totalLiquidable)}
			/>

			<LiquidationsSearch
				step={{ category: 'Home', name: `${data.symbol.toUpperCase()} Liquidation Levels`, hideOptions: true }}
			/>

			{!['SOL', 'MSOL', 'STSOL'].includes(data.symbol.toUpperCase()) && (
				<>
					<PanelThicc as="p">
						We are now tracking
						<Link href={`/liquidations/sol`} passHref>
							<StyledAnchor>
								<Image src={`/asset-icons/sol.png`} width={24} height={24} alt={'SOL'} style={{ borderRadius: 12 }} />
								<b>Solana</b>
							</StyledAnchor>
						</Link>
						ecosystem assets! Choose one from the asset picker dropdown menu!
					</PanelThicc>
					<PanelSmol as="p">
						We are now tracking
						<Link href={`/liquidations/sol`} passHref>
							<StyledAnchor>
								<Image src={`/asset-icons/sol.png`} width={24} height={24} alt={'SOL'} style={{ borderRadius: 12 }} />
								<b>Solana</b>
							</StyledAnchor>
						</Link>
						!
					</PanelSmol>
				</>
			)}

			<Header>Liquidation levels in DeFi 💦</Header>
			<LiquidationsHeader {...data} />
			<LiquidationsProvider>
				<LiquidationsContent data={data} prevData={prevData} />
			</LiquidationsProvider>
			<SmolHints>
				<Clock size={12} />
				<i>Last updated {minutesAgo}min ago</i>
			</SmolHints>
			<LiquidationsTable data={data} prevData={prevData} />
		</Layout>
	)
}

const SmolHints = styled.div`
	display: flex;
	gap: 6px;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	margin-top: -1rem;
	opacity: 0.6;
`

export default LiquidationsHomePage
