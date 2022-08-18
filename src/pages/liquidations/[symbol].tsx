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

import Layout from '~/layout'
import { LiquidationsSearch } from '~/components/Search'
import { Header } from '~/Theme'
import { LiquidationsHeader } from '../../components/LiquidationsPage/LiquidationsHeader'
import { LiquidationsContent } from '../../components/LiquidationsPage/LiquidationsContent'
import styled from 'styled-components'
import React, { useEffect, useState } from 'react'
import { Clock } from 'react-feather'
import { Panel } from '~/components'
import { LiquidationsTable } from '../../components/LiquidationsPage/LiquidationsTable'
import SEO from '~/components/SEO'
import { assetIconUrl } from '~/utils'

export const getStaticProps: GetStaticProps<{ data: ChartData; prevData: ChartData }> = async ({ params }) => {
	const symbol = params.symbol as string
	const data = await getLatestChartData(symbol.toUpperCase(), 100)
	const prevData = (await getPrevChartData(symbol.toUpperCase(), 100, 3600 * 24)) ?? data
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
				logo={'https://defillama.com' + assetIconUrl(asset?.symbol)}
				tvl={'$' + getReadableValue(data.totalLiquidable)}
			/>

			<LiquidationsSearch step={{ category: 'Liquidation Levels', name: data.symbol, hideOptions: true }} />
			<Panel as="p" style={{ textAlign: 'center', margin: '0', display: 'block' }}>
				<span>The liquidation levels dashboard is still under development. You're so early, anon!</span>
			</Panel>
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
