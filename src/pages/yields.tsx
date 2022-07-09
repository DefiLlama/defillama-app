import Head from 'next/head'
import { mutate } from 'swr'
import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { useYieldPageData } from '~/api/categories/yield/client'
import { useFormatYieldsData } from '~/api/categories/yield'

async function prefetchData() {
	return await fetch('/api/poolsAndAggr').then((data) => {
		mutate('/pools-and-aggr', data, false)
		return data
	})
}

// if we are on the browser trigger a prefetch as soon as possible
if (typeof window !== 'undefined') prefetchData()

export default function ApyHomePage() {
	const { data, loading } = useYieldPageData()
	const formattedData = useFormatYieldsData(data, loading)

	return (
		<>
			<Head>
				{/* This will tell the browser to preload the data for our page */}
				<link rel="preload" href="/api/poolsAndAggr" as="fetch" crossOrigin="anonymous" />
			</Head>
			<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
				<YieldPage loading={loading} {...formattedData} />
			</Layout>
		</>
	)
}
