import { RecentProtocols } from '~/components/RecentProtocols'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { FORK_API } from '~/constants'

export async function getStaticProps() {
	const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt', 'chainTvls'])
	const { forks } = await fetch(FORK_API).then((r) => r.json())

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
}

export default function Protocols(props) {
	return (
		<RecentProtocols title="TVL Rankings - DefiLlama" name="Recent" header="Recently Listed Protocols" {...props} />
	)
}
