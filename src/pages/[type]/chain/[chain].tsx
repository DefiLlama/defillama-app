import { getOverview } from '~/api/categories/adaptors'

export async function getStaticPaths() {
	const { allChains: arrFees } = await getOverview('fees')
	/* 	const { allChains: arrVols } = await getOverview('volumes') */
	const paths = [
		...arrFees.map((chain) => ({
			params: { type: 'fees', chain: chain.toLowerCase() }
		}))
		/* ...arrVols.map((chain) => ({
			params: { type: 'volumes', chain: chain.toLowerCase() }
		})) */
	]

	return { paths, fallback: 'blocking' }
}

export { default, getStaticProps } from './../../[type]'
