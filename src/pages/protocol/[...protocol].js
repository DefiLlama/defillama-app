import ProtocolContainer from 'containers/ProtocolContainer'
import { standardizeProtocolName } from 'utils'
import { getProtocols, getProtocol, fuseProtocolData, getYieldPageData, revalidate } from 'utils/dataApi'

export async function getStaticProps({
  params: {
    protocol: [protocol, selectedChain = 'all', denomination = null],
  },
}) {

  const data = await getYieldPageData({ project: protocol })

  const pools = data.props.pools
  const chainList = data.props.chainList
  const projectList = data.props.projectList

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

  return {
    props: {
      protocol,
      protocolData,
      selectedChain,
      denomination,
      pools,
      projectList,
      chainList,
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

export default function Protocols({ denomination, selectedChain, protocol, protocolData, pools, projectList, chainList }) {
  return (
    <ProtocolContainer
      title={`${protocolData.name}: TVL and stats - DefiLlama`}
      protocol={protocol}
      protocolData={protocolData}
      denomination={denomination ?? undefined}
      selectedChain={selectedChain}
      pools={pools}
      projectList={projectList}
      chainList={chainList}
    />
  )
}