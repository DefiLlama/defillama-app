/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetServerSideProps } from 'next'
import useSWR from 'swr'
import { fetcher } from '~/utils/useSWR'
import Layout from '~/layout'
// import { revalidate } from '~/api'

const LiquidationsPage: NextPage = () => {
	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<h1>Liquidations</h1>
		</Layout>
	)
}

export default LiquidationsPage
