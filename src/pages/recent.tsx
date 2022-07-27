import { RecentProtocols } from '~/components/RecentProtocols'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'

export async function getStaticProps() {
	const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt', 'chainTvls'])
	const protocols = protocolsRaw.protocols.filter((p) => p.listedAt).sort((a, b) => b.listedAt - a.listedAt)
	return {
		props: {
			protocols,
			chainList: protocolsRaw.chains
		},
		revalidate: revalidate()
	}
}

export default function Protocols(props) {
	return (
		<RecentProtocols title="TVL Rankings - DefiLlama" name="Recent" header="Recently Listed Protocols" {...props} />
	)
}
