import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { getYieldPageData } from '~/api/categories/yield'
import { revalidate } from '~/api'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { compressPageProps, decompressPageProps } from '~/utils/compress'

export async function getStaticProps() {
	const data = await getYieldPageData()
	data.props.pools = data.props.pools.filter((p) => p.apy > 0)

	const compressed = compressPageProps(data.props)

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function ApyHomePage({ compressed }) {
	const data = decompressPageProps(compressed)

	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
