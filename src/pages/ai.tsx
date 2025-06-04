import { maxAgeForNext } from '~/api'
import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { LlamaAI } from '~/containers/LlamaAI'
import { ISearchData } from '~/containers/LlamaAI/types'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('LlamaAi', async () => {
	const [{ protocols }, { chains }] = await Promise.all([
		getProtocolsByChain({ chain: 'All', metadata: { name: 'All' } }),
		getChainsByCategory({ category: 'All' })
	])

	const protocolsAndChains: ISearchData['protocolsAndChains'] = []
	const tokens: ISearchData['tokens'] = []

	protocols.forEach((protocol) => {
		if (protocol.childProtocols) {
			protocolsAndChains.push({
				value: protocol.name,
				listValue: `@${protocol.name}`,
				slug: `protocol_parent=${slug(protocol.name)}`,
				tvl: protocol.tvl?.default?.tvl ?? 0
			})

			protocol.childProtocols.forEach((childProtocol) => {
				protocolsAndChains.push({
					value: childProtocol.name,
					listValue: `@${childProtocol.name}`,
					slug: `protocol=${slug(childProtocol.name)}`,
					tvl: childProtocol.tvl?.default?.tvl ?? 0
				})
			})
		} else {
			protocolsAndChains.push({
				value: protocol.name,
				listValue: `@${protocol.name}`,
				slug: `protocol=${slug(protocol.name)}`,
				tvl: protocol.tvl?.default?.tvl ?? 0
			})
		}
	})

	chains.forEach((chain) => {
		protocolsAndChains.push({
			value: chain.name,
			listValue: `@${chain.name}`,
			slug: `chain=${slug(chain.name)}`,
			tvl: chain.tvl ?? 0
		})
	})

	return {
		props: { searchData: { protocolsAndChains: protocolsAndChains.sort((a, b) => b.tvl - a.tvl), tokens } },
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage({ searchData }: { searchData: ISearchData }) {
	return <LlamaAI searchData={searchData} />
}
