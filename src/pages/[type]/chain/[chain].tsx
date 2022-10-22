import { getOverview } from '~/api/categories/adaptors'

export async function getStaticPaths() {
	const { allChains: arrFees } = await getOverview('fees')
	const { allChains: arrAggreg } = await getOverview('aggregators')
	const { allChains: arrDeri } = await getOverview('derivatives')
	const { allChains: arrVols } = await getOverview('volumes')
	const paths = [
		...arrFees.map((chain) => ({
			params: { type: 'fees', chain: chain.toLowerCase() }
		})),
		...arrAggreg.map((chain) => ({
			params: { type: 'aggregators', chain: chain.toLowerCase() }
		})),
		...arrVols.map((chain) => ({
			params: { type: 'volumes', chain: chain.toLowerCase() }
		})),
		...arrDeri.map((chain) => ({
			params: { type: 'derivatives', chain: chain.toLowerCase() }
		}))
	]

	return { paths, fallback: 'blocking' }
}

export { default, getStaticProps } from './../../[type]'
