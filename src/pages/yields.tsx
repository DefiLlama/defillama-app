import Head from 'next/head'
import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { useYieldPageData } from '~/api/categories/yield/client'
import { useFormatYieldsData, getYieldPageData } from '~/api/categories/yield'

// if we are on the browser trigger a prefetch as soon as possible
if (typeof window !== 'undefined') getYieldPageData()

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
