import { maxAgeForNext } from '~/api'
import { getRecentProtocols } from '~/containers/Protocols/queries'
import { RecentProtocols } from '~/containers/Protocols/RecentProtocols'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('recent', async () => {
	const data = await getRecentProtocols()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Recently Listed Protocols']

export default function Protocols(props) {
	return (
		<Layout
			title="Recently Listed Protocols - DefiLlama"
			description={`Recently Listed Protocols on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`recently listed protocols, defi recently listed protocols`}
			canonicalUrl={`/recent`}
			pageName={pageName}
		>
			<RecentProtocols {...props} />
		</Layout>
	)
}
