import Layout from '~/layout'
import { ProtocolList } from '~/containers/ProtocolList'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('protocols', async () => {
	const { protocols } = await getSimpleProtocolsPageData()

	return {
		props: {
			protocols
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ protocols }) {
	return (
		<Layout title={`TVL Rankings - DefiLlama`} defaultSEO>
			<ProtocolList filteredProtocols={protocols} showChainList={false} />
		</Layout>
	)
}
