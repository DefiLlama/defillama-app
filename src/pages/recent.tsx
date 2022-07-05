import { RecentProtocols } from '~/components/RecentProtocols'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'

export async function getStaticProps() {
	const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt'])
	const protocols = protocolsRaw.protocols.filter((p) => p.listedAt).sort((a, b) => b.listedAt - a.listedAt)
	return {
		props: {
			protocols
		},
		revalidate: revalidate()
	}
}

export default function Protocols({ protocols }) {
	return (
		<RecentProtocols
			protocols={protocols}
			title="TVL Rankings - DefiLlama"
			name="Recent"
			header="Recently Listed Protocols"
		/>
	)
}
