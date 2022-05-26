import ProtocolContainer from 'containers/ProtocolContainer'
import { standardizeProtocolName } from 'utils'
import { getProtocols, getProtocol, fuseProtocolData, revalidate } from 'utils/dataApi'
import getColor from 'utils/getColor'

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

  const dataLength = JSON.stringify(protocolRes).length
  if (dataLength >= 5.9e6) {
    delete protocolRes.tokensInUsd;
    delete protocolRes.tokens;
    Object.keys(protocolRes.chainTvls).forEach(chain => {
      delete protocolRes.chainTvls[chain].tokensInUsd;
      delete protocolRes.chainTvls[chain].tokens;
    })
  }

  const protocolData = fuseProtocolData(protocolRes, protocol)

  const backgroundColor = await getColor({ protocol, logo: protocolData.logo })

  return {
    props: {
      protocol,
      protocolData,
      selectedChain,
      denomination,
      backgroundColor
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

export default function Protocols({ denomination, protocolData, ...props }) {
  return (
    <ProtocolContainer
      title={`${protocolData.name}: TVL and stats - DefiLlama`}
      protocolData={protocolData}
      denomination={denomination ?? undefined}
      {...props}
    />
  )
}