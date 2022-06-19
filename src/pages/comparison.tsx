import ComparisonContainer from 'containers/ComparisonContainer'

import { PROTOCOLS_API } from 'constants/index'
import { standardizeProtocolName } from 'utils'
import { revalidate } from 'utils/dataApi'

export async function getStaticProps() {
  const res = await fetch(PROTOCOLS_API).then((res) => res.json())

  const protocolsMcapTvl = res.protocols.reduce((acc, { name, mcap = null, tvl = null }) => {
    acc[standardizeProtocolName(name)] = {
      mcap: mcap,
      tvl,
    }
    return acc
  }, {})

  return {
    props: {
      protocolsMcapTvl,
    },
    revalidate: revalidate(),
  }
}

export default function Protocols({ protocolsMcapTvl }) {
  return <ComparisonContainer title="Protocol Price Comparison - DefiLlama" protocolsMcapTvl={protocolsMcapTvl} />
}
