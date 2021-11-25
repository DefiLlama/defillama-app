import ChainPage from '../../components/ChainPage'
import { PROTOCOLS_API } from '../../constants/index'
import { GeneralLayout } from '../../layout'
import { getChainPageData, revalidate } from '../../utils/dataApi'

export async function getStaticProps({ params }) {
  const chain = params.chain
  const data = await getChainPageData(chain)
  return {
    ...data,
    revalidate: revalidate()
  }
}
export async function getStaticPaths() {
  const res = await fetch(PROTOCOLS_API)

  const paths = (await res.json()).chains.map(chain => ({
    params: { chain }
  }))

  return { paths, fallback: 'blocking' }
}

export default function Chain({ chain, ...props }) {
  return (
    <GeneralLayout title={`${chain} TVL - DefiLlama`}>
      <ChainPage {...props} selectedChain={chain} />
    </GeneralLayout>
  )
}
