import { GeneralLayout } from '../../layout'
import { getProtocols, getProtocol } from 'api'
import { standardizeTokenName } from 'utils'

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export async function getStaticProps({
  params: {
    token: [token, selectedChain = null, denomination = null]
  }
}) {
  console.log(token, 'token')
  const { protocolsDict } = await getProtocols()
  const tokenData = await getProtocol(token)

  console.log(tokenData, selectedChain)
  // const tokenData =
  return {
    props: {
      token,
      selectedChain,
      denomination,
      tokenData: {
        ...(protocolsDict[token] || {}),
        ...tokenData
      }
    }
  }
}

export async function getStaticPaths() {
  const res = await getProtocols()

  const paths = res.protocols.map(({ name }) => ({
    params: { token: [standardizeTokenName(name)] }
  }))

  return { paths, fallback: 'blocking' }
}

export default function Protocols({ token }) {
  return <GeneralLayout title={`${capitalizeFirstLetter(token)} Protocol: TVL and stats - DefiLlama`}></GeneralLayout>
}
