import Layout from '~/layout'
import PlotsPage from '~/components/YieldsPage/indexPlots'
import { revalidate } from '~/api'
import { getYieldPageData, getYieldMedianData } from '~/api/categories/yield'
import pako from 'pako'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'

export async function getStaticProps() {
	const data = await getYieldPageData()
	const median = await getYieldMedianData()
	data['props']['median'] = median.props
	const strData = JSON.stringify(data)

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldPlots(compressedProps) {
	const b = new Uint8Array(Buffer.from(compressedProps.compressed, 'base64'))
	const data = JSON.parse(pako.inflate(b, { to: 'string' }))
	return (
		<Layout title={`Overview - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<PlotsPage {...data.props} />
		</Layout>
	)
}
