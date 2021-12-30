import { GeneralLayout } from 'layout'
import ComparisonContainer from 'containers/ComparisonContainer'

import { PROTOCOLS_API } from 'constants/index'
import { standardizeProtocolName } from 'utils'
import { revalidate } from 'utils/dataApi'

export async function getStaticProps({ params = {} }) {
  const [protocolA = '', protocolB = ''] = params?.protocol || []
  const res = await fetch(PROTOCOLS_API).then(res => res.json())

  const protocolsMcapTvl = res.protocols.reduce((acc, { name, mcap = null, tvl = null }) => {
    acc[standardizeProtocolName(name)] = {
      mcap: mcap,
      tvl
    }
    return acc
  }, {})

  return {
    props: {
      protocolsMcapTvl,
      protocolA: standardizeProtocolName(protocolA),
      protocolB: standardizeProtocolName(protocolB)
    },
    revalidate: revalidate()
  }
}

export async function getStaticPaths() {
  return { paths: [{ params: { protocol: false } }], fallback: 'blocking' }
}

export default function Protocols({ protocolA, protocolB, protocolsMcapTvl }) {
  return (
    <GeneralLayout title="Protocol Price Comparison - DefiLlama" defaultSEO>
      <ComparisonContainer protocolsMcapTvl={protocolsMcapTvl} protocolA={protocolA} protocolB={protocolB} />
    </GeneralLayout>
  )
}
