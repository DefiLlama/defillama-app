import Layout from '~/layout'
import ProtocolList from '~/components/ProtocolList'
import { addMaxAgeHeaderForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const { protocols } = await getSimpleProtocolsPageData()

	return {
		props: {
			protocols
		}
	}
}

export default function Protocols({ protocols }) {
	return (
		<Layout title={`TVL Rankings - DefiLlama`} defaultSEO>
			<ProtocolList filteredProtocols={protocols} showChainList={false} />
		</Layout>
	)
}
