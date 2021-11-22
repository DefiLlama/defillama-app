import { GeneralLayout } from '../../layout'
import ProtocolContainer from 'containers/ProtocolContainer'

import { getProtocols, getProtocol } from 'api'
import { standardizeProtocolName, capitalizeFirstLetter } from 'utils'
import { ProtocolDataProvider } from 'contexts'

export async function getStaticProps({
  params: {
    protocol: [protocol, selectedChain = 'all', denomination = null]
  }
}) {
  const { protocolsDict } = await getProtocols()
  const protocolData = await getProtocol(protocol)
  const historicalChainTvls = { ...(protocolData?.chainTvls ?? {}) }
  // Don't overwrite topTokens' chainTvls response
  delete protocolData.chainTvls

  return {
    props: {
      protocol,
      selectedChain,
      denomination,
      protocolData: {
        ...(protocolsDict[protocol] || {}),
        ...protocolData,
        tvl: protocolData?.tvl.length > 0 ? protocolData?.tvl[protocolData?.tvl.length - 1]?.totalLiquidityUSD : 0,
        tvlList: protocolData?.tvl
          .filter(item => item.date)
          .map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD]),
        historicalChainTvls
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
          denomination={denomination ?? undefined}
          selectedChain={selectedChain}
        />
      </GeneralLayout>
    </ProtocolDataProvider>
  )
}
