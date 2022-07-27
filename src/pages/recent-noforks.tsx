import { RecentProtocols } from '~/components/RecentProtocols'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { FORK_API } from '~/constants'

export async function getStaticProps() {
	const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt'])
	const forks = await fetch(FORK_API).then((r) => r.json())
	const forked = {}
	Object.values(forks.forks).map((forksList) => {
		;(forksList as string[]).map((f) => {
			forked[f] = true
		})
	})

	const protocols = protocolsRaw.protocols
		.filter((p) => forked[p.name] === undefined)
		.map((p) => ({
			listedAt: 1609506000, // 1/1/2021
			...p
		}))
		.sort((a, b) => b.listedAt - a.listedAt)
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
		<RecentProtocols
			title="TVL Rankings - DefiLlama"
			name="Recent"
			header="Recently Listed Protocols - No forks"
			{...props}
		/>
	)
}
