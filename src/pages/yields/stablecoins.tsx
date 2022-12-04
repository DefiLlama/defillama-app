import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'
import { compressPageProps, decompressPageProps } from '~/utils/compress'

export async function getStaticProps() {
	const data = await getYieldPageData()

	const compressed = compressPageProps(data.props)

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldPlots({ compressed }) {
	const data = decompressPageProps(compressed)

	return (
		<Layout title={`Stablecoins - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
