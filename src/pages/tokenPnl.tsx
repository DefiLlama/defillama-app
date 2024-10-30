import { getStaticProps as compareProps } from './compare-tokens'
import Layout from '~/layout'
import TokenPnl from '~/containers/TokenPnl'

export const getStaticProps = compareProps

export default function Compare(props) {
	return (
		<Layout title={`Price with FDV of - DefiLlama`}>
			<TokenPnl {...props} />
		</Layout>
	)
}
