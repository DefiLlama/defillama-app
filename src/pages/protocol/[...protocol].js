import { GeneralLayout } from '../../layout'
import ProtocolContainer from 'containers/ProtocolContainer'

import { getProtocols, getProtocol } from 'api'
import { standardizeProtocolName, capitalizeFirstLetter } from 'utils'
import { ProtocolDataProvider } from 'contexts'

export async function getStaticProps({
  params: {
    protocol: [protocol, selectedChain = null, denomination = null]
  }
}) {
  const { protocolsDict } = await getProtocols()
  const protocolData = await getProtocol(protocol)

  return {
    props: {
      protocol,
      selectedChain,
      denomination,
      protocolData: {
        ...(protocolsDict[protocol] || {}),
        ...protocolData
      }
    }
  }
}

export async function getStaticPaths() {
  const res = await getProtocols()

  const paths = res.protocols.map(({ name }) => ({
    params: { protocol: [standardizeProtocolName(name)] }
  }))

  return { paths, fallback: 'blocking' }
}

export default function Protocols({ denomination, selectedChain, protocol, protocolData }) {
  return (
    <ProtocolDataProvider protocolData={protocolData}>
      <GeneralLayout title={`${capitalizeFirstLetter(protocol)} Protocol: TVL and stats - DefiLlama`}>
        <ProtocolContainer
          protocol={protocol}
          protocolData={protocolData}
          denomination={denomination}
          selectedChain={selectedChain}
        />
      </GeneralLayout>
    </ProtocolDataProvider>
  )
}
