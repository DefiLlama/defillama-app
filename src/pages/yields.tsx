import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { useYieldPageData } from '~/api/categories/yield/client'

export default function ApyHomePage() {
	const { data, loading } = useYieldPageData()

	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<YieldPage data={data} loading={loading} />
		</Layout>
	)
}
