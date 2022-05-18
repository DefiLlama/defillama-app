import { GeneralLayout } from 'layout'
import ProtocolContainer from 'containers/ProtocolContainer'

import { standardizeProtocolName } from 'utils'
import { getProtocols, getProtocol, fuseProtocolData, revalidate } from 'utils/dataApi'

export async function getStaticProps({
  params: {
    protocol: [protocol, selectedChain = 'all', denomination = null],
  },
}) {
  const protocolRes = await getProtocol(protocol)

  if (!protocolRes || protocolRes.statusCode === 400) {
    return {
      notFound: true,
    }
  }
  const protocolData = fuseProtocolData(protocolRes, protocol)

  return {
    props: {
      protocol,
      protocolData,
      selectedChain,
      denomination,
    },
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const res = await getProtocols()

  const paths = res.protocols.slice(0, 30).map(({ name }) => ({
    params: { protocol: [standardizeProtocolName(name)] },
  }))

  return { paths, fallback: 'blocking' }
}

export default function Protocols({ denomination, selectedChain, protocol, protocolData }) {
  return (
    <GeneralLayout title={`${protocolData.name}: TVL and stats - DefiLlama`}>
      <ProtocolContainer
        protocol={protocol}
        protocolData={protocolData}
        denomination={denomination ?? undefined}
        selectedChain={selectedChain}
      />
    </GeneralLayout>
  )
}
