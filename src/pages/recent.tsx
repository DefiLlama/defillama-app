import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { FORK_API } from '~/constants'
import { RecentProtocols } from '~/containers/RecentProtocols'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('recent', async () => {
	const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt', 'chainTvls'])
	const { forks } = await fetchJson(FORK_API)

	const protocols = protocolsRaw.protocols.filter((p) => p.listedAt).sort((a, b) => b.listedAt - a.listedAt)
	const forkedList: { [name: string]: boolean } = {}

	Object.values(forks).map((list: string[]) => {
		list.map((f) => {
			forkedList[f] = true
		})
	})

	return {
		props: {
			protocols,
			chainList: protocolsRaw.chains,
			forkedList
		},
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
