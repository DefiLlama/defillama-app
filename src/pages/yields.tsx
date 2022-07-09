import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { useYieldPageData } from '~/api/categories/yield/client'
import { useFormatYieldsData } from '~/api/categories/yield'
import Head from 'next/head'

export default function ApyHomePage() {
	const { data, loading } = useYieldPageData()
	const formattedData = useFormatYieldsData(data, loading)
	return (
		<>
			<Head>
				<link rel="preload" href="/api/poolsAndAggr" as="fetch" crossOrigin="anonymous" />
			</Head>
			<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
				<YieldPage loading={loading} {...formattedData} />
			</Layout>
		</>
	)
}
