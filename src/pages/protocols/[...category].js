import ProtocolList from '../../components/ProtocolList'
import { PROTOCOLS_API } from '../../constants/index'
import Layout from '../../layout'
import { getProtocolsPageData, revalidate } from '../../utils/dataApi'

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export async function getStaticProps({
  params: {
    category: [category, chain],
  },
}) {
  const props = await getProtocolsPageData(category, chain)

  if (props.filteredProtocols.length === 0) {
    return {
      notFound: true,
    }
  }
  return {
    props,
    revalidate: revalidate(),
  }
}

export async function getStaticPaths() {
  const res = await fetch(PROTOCOLS_API)

  const paths = (await res.json()).protocolCategories.slice(0, 10).map((category) => ({
    params: { category: [category.toLowerCase()] },
  }))

  return { paths, fallback: 'blocking' }
}

export default function Protocols({ category, chains, filteredProtocols, chain }) {
  return (
    <Layout title={`${capitalizeFirstLetter(category)} TVL Rankings - DefiLlama`} defaultSEO>
      <ProtocolList
        category={capitalizeFirstLetter(category)}
        chains={chains}
        selectedChain={chain}
        filteredProtocols={filteredProtocols}
      />
    </Layout>
  )
}
