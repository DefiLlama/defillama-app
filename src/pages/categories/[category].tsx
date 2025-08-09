import Protocols, { getStaticProps } from '../categories'

export { getStaticProps }

export async function getStaticPaths() {
	return {
		paths: [{ params: { category: 'EVM' } }, { params: { category: 'Non-EVM' } }],
		fallback: 'blocking'
	}
}

export default Protocols
