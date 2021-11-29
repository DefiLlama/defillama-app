import ProtocolList from '../components/ProtocolList'
import { PROTOCOLS_API } from '../constants/index'
import { GeneralLayout } from '../layout'
import { keepNeededProperties, revalidate } from '../utils/dataApi'

export async function getStaticProps({ params }) {
  const res = await fetch(PROTOCOLS_API).then(r => r.json())
  const protocols = res.protocols
    .filter(p => p.listedAt)
    .map(p => keepNeededProperties(p, ['tvl', 'name', 'symbol', 'chains', 'change_1d', 'mcaptvl', 'listedAt']))
    .sort((a, b) => b.listedAt - a.listedAt)
  return {
    props: {
      protocols
    },
    revalidate: revalidate()
  }
}

export default function Protocols({ protocols }) {
  const currentTimestamp = Date.now() / 1000
  const secondsInDay = 3600 * 24
  return (
    <GeneralLayout title={`TVL Rankings - DefiLlama`}>
      <ProtocolList
        filteredProtocols={protocols.map(p => ({
          ...p,
          listedAt: ((currentTimestamp - p.listedAt) / secondsInDay).toFixed(2)
        }))}
        showChainList={false}
        columns={[undefined, 'chains', 'change_1d', 'listedAt']}
        defaultSortingColumn="listedAt"
      />
    </GeneralLayout>
  )
}
