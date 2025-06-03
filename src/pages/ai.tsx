import { maxAgeForNext } from '~/api'
import { PROTOCOLS_API } from '~/constants'
import { LlamaAI } from '~/containers/LlamaAI'
import { fetchWithErrorLogging } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('LlamaAi', async () => {
	const data = await fetchWithErrorLogging(PROTOCOLS_API).then((res) => res.json())

	const searchData = {
		protocolsAndChains: [],
		tokens: []
	}

	data.protocols.forEach((protocol: any) => {
		searchData.protocolsAndChains.push({
			value: protocol.name,
			listValue: `@${protocol.name}`
		})
	})

	data.parentProtocols.forEach((protocol: any) => {
		searchData.protocolsAndChains.push({
			value: protocol.name,
			listValue: `@${protocol.name}`
		})
	})

	data.chains.forEach((chain: any) => {
		searchData.protocolsAndChains.push({
			value: chain,
			listValue: `@${chain}`
		})
	})

	return {
		props: { searchData },
		revalidate: maxAgeForNext([22])
	}
})

export default function LlamaAIPage({ searchData }: { searchData: { label: string; slug: string }[] }) {
	return <LlamaAI searchData={searchData} />
}
