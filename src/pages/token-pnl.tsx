import * as React from 'react'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import TokenPnl from '~/containers/TokenPnl'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('token-pnl', async () => {
	const coinsData = await getAllCGTokensList()
	return {
		props: {
			coinsData
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function TokenPnlPage({ coinsData }) {
	return (
		<Layout title={`Token PNL - DefiLlama`}>
			<TokenPnl coinsData={coinsData} />
		</Layout>
	)
}
