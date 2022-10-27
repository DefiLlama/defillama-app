import Layout from '~/layout'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'
import { YieldsWatchlistContainer } from '~/containers/Watchlist'
import pako from 'pako'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'

export async function getStaticProps() {
	const data = await getYieldPageData()
	const strData = JSON.stringify(data.props.pools)

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function Portfolio(compressedProps) {
	const b = new Uint8Array(Buffer.from(compressedProps.compressed, 'base64'))
	const data = JSON.parse(pako.inflate(b, { to: 'string' }))
	return (
		<Layout title={`Saved Pools - DefiLlama`} defaultSEO>
			<Announcement notCancellable>{disclaimer}</Announcement>
			<YieldsWatchlistContainer protocolsDict={data} />
		</Layout>
	)
}
