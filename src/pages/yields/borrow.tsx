import Layout from '~/layout'
import YieldPageBorrow from '~/components/YieldsPage/indexBorrow'
import { revalidate } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { compressPageProps, decompressPageProps } from '~/utils/compress'

export async function getStaticProps() {
	const data = await getLendBorrowData()

	const compressed = compressPageProps(data.props)

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldBorrow({ compressed }) {
	const data = decompressPageProps(compressed)
	return (
		<Layout title={`Lend/Borrow rates - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPageBorrow {...data} />
		</Layout>
	)
}
