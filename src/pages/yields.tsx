import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { useYieldPageData } from '~/api/categories/yield/client'
import { useFormatYieldsData } from '~/api/categories/yield'

export default function ApyHomePage() {
	const { data, loading } = useYieldPageData()
	const formattedData = useFormatYieldsData(data, loading)
	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO prefetchYield>
			<YieldPage loading={loading} {...formattedData} />
		</Layout>
	)
}
