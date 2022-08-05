/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetServerSideProps } from 'next'
import useSWR from 'swr'
import { fetcher } from '~/utils/useSWR'
import Layout from '~/layout'
// import { revalidate } from '~/api'

import { Header } from '~/Theme'
import { ProtocolsChainsSearch } from '~/components/Search'
import { ChartData, useLiquidationsState } from '~/utils/liquidations'
import { ChartState } from '../../components/LiquidationsPage/utils'
import { LiquidationsContainer } from '../../components/LiquidationsPage/LiquidationsContainer'

const LiquidationsPage: NextPage = () => {
	const { asset, aggregateBy, filters } = useLiquidationsState()

	const { data } = useSWR<ChartData>(
		// TODO: implement the full api
		`http://localhost:3000/api/mock-liquidations/?symbol=${asset}&aggregateBy=${aggregateBy}${
			filters.includes('all') ? '' : `&filters=${filters.join(',')}`
		}`,
		fetcher
	)

	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch
				step={{ category: 'Home', name: 'Liquidation Levels', hideOptions: true, hideSearch: true }}
			/>

			<Header>Liquidation Levels in DeFi 💦</Header>
			{data && <LiquidationsContainer chartState={{ asset, aggregateBy, filters }} chartData={data} />}
		</Layout>
	)
}

export default LiquidationsPage
