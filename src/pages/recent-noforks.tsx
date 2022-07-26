import { RecentProtocols } from '~/components/RecentProtocols'
import { revalidate } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { FORK_API } from '~/constants'

export async function getStaticProps() {
	const protocolsRaw = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl', 'listedAt'])
  const forks = await fetch(FORK_API).then((r) => r.json())
  const forked = {}
  Object.values(forks.forks).map(forksList=>{
    (forksList as string[]).map(f=>{
      forked[f] = true
    })
  })
  const protocols = protocolsRaw.protocols.filter((p) => p.listedAt && forked[p.name] === undefined).sort((a, b) => b.listedAt - a.listedAt)
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
			header="Recently Listed Protocols - No forks"
		/>
	)
}
