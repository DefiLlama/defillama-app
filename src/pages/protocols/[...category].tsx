import Layout from '~/layout'
import ProtocolList from '~/components/ProtocolList'
import { addMaxAgeHeaderForNext } from '~/api'
import { getProtocolsPageData } from '~/api/categories/protocols'
import { capitalizeFirstLetter } from '~/utils'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({
	params: {
		category: [category, chain]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const props = await getProtocolsPageData(category, chain)

	if (props.filteredProtocols.length === 0) {
		return {
			notFound: true
		}
	}
	return { props }
}

export default function Protocols({ category, ...props }) {
	return (
		<Layout title={`${capitalizeFirstLetter(category)} TVL Rankings - DefiLlama`} defaultSEO>
			<ProtocolList category={capitalizeFirstLetter(category)} {...props} />
		</Layout>
	)
}
