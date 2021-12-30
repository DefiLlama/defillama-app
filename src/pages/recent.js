import ProtocolList from '../components/ProtocolList'
import { GeneralLayout } from '../layout'
import { revalidate, getSimpleProtocolsPageData } from '../utils/dataApi'

export async function getStaticProps({ params }) {
  const protocolsRaw = await getSimpleProtocolsPageData([
    'tvl',
    'name',
    'symbol',
    'chains',
    'change_1d',
    'mcaptvl',
    'listedAt',
    'extraTvl'
  ])
  const protocols = protocolsRaw.protocols.filter(p => p.listedAt).sort((a, b) => b.listedAt - a.listedAt)
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
    <GeneralLayout title={`TVL Rankings - DefiLlama`} defaultSEO>
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
