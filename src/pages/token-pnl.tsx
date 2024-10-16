import React from 'react'
import TokenPnl from '~/components/TokenPnl'
import Layout from '~/layout'
import { QueryClient, QueryClientProvider, Hydrate } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { withPerformanceLogging } from '~/utils/perf'
import { getAllCGTokensList, maxAgeForNext } from '~/api'

export const getStaticProps = withPerformanceLogging('token-pnl', async () => {
	const coinsData = await getAllCGTokensList()
	return {
		props: {
			coinsData,
			dehydratedState: {}
		},
		revalidate: maxAgeForNext([22])
	}
})

const queryClient = new QueryClient()

export default function TokenPnlPage({ coinsData, dehydratedState }) {
	return (
		<QueryClientProvider client={queryClient}>
			<Hydrate state={dehydratedState}>
				<Layout title={`Token PNL - DefiLlama`}>
					<TokenPnl coinsData={coinsData} />
				</Layout>
				<ReactQueryDevtools />
			</Hydrate>
		</QueryClientProvider>
	)
}
