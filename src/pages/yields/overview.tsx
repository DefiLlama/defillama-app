import Layout from '~/layout'
import PlotsPage from '~/components/YieldsPage/indexPlots'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { revalidate } from '~/api'
import { getYieldPageData, getYieldMedianData } from '~/api/categories/yield'
import { compressPageProps, decompressPageProps } from '~/utils/compress'

export async function getStaticProps() {
	const {
		props: { ...data }
	} = await getYieldPageData()
	data.pools = data.pools.filter((p) => p.apy > 0)
	const median = await getYieldMedianData()

	const compressed = compressPageProps({ ...data, median: median.props })

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldPlots({ compressed }) {
	const data = decompressPageProps(compressed)
	return (
		<Layout title={`Overview - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<PlotsPage {...data} />
		</Layout>
	)
}
