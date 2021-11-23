import { GeneralLayout } from 'layout'
import ProtocolContainer from 'containers/ProtocolContainer'

import { standardizeProtocolName, capitalizeFirstLetter } from 'utils'
import { getProtocols, getProtocol, fuseProtocolData, revalidate } from 'utils/dataApi'

export async function getStaticProps({
  params: {
    protocol: [protocol, selectedChain = 'all', denomination = null]
  }
}) {
  const { protocolsDict } = await getProtocols()
  const protocolRes = await getProtocol(protocol)
  const protocolData = fuseProtocolData(protocolsDict, protocolRes, protocol)

  const chainTvls = Object.fromEntries(Object.entries(protocolsDict[protocol].chainTvls).sort((a, b) => b[1] - a[1]))

  return {
    props: {
      protocol,
      protocolData,
      selectedChain,
<<<<<<< HEAD
      denomination
=======
      denomination,
      protocolData: {
        ...(protocolsDict[protocol] || {}),
        ...protocolData,
        tvl: protocolData?.tvl.length > 0 ? protocolData?.tvl[protocolData?.tvl.length - 1]?.totalLiquidityUSD : 0,
        tvlList: protocolData?.tvl
          .filter(item => item.date)
          .map(({ date, totalLiquidityUSD }) => [date, totalLiquidityUSD]),
        historicalChainTvls,
        chainTvls
      }
>>>>>>> 38ba74f70771db9ca6b26d259fc5dc6e6dea3c2c
    },
    revalidate: revalidate()
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
    <GeneralLayout title={`${capitalizeFirstLetter(protocol)} Protocol: TVL and stats - DefiLlama`}>
      <ProtocolContainer
        protocol={protocol}
        protocolData={protocolData}
        denomination={denomination ?? undefined}
        selectedChain={selectedChain}
      />
    </GeneralLayout>
  )
}
