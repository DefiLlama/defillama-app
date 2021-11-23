import { GeneralLayout } from 'layout'
import ComparisonContainer from 'containers/ComparisonContainer'

import { standardizeProtocolName } from 'utils'
import { revalidate } from 'utils/dataApi'

export async function getStaticProps({ params = {} }) {
  const [protocolA = '', protocolB = ''] = params?.protocol || []
  return {
    props: {
      protocolA: standardizeProtocolName(protocolA),
      protocolB: standardizeProtocolName(protocolB)
    },
    revalidate: revalidate()
  }
}

export async function getStaticPaths() {
  return { paths: [{ params: { protocol: false } }], fallback: 'blocking' }
}

export default function Protocols({ protocolA, protocolB }) {
  return (
    <GeneralLayout title="Protocol Price Comparison - DefiLlama">
      <ComparisonContainer protocolA={protocolA} protocolB={protocolB} />
    </GeneralLayout>
  )
}
