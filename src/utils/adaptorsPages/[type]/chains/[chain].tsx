import { getOverview } from '~/api/categories/adaptors'
import { getStaticPropsByType } from './index'

export const getStaticPathsByType = (type: string) => async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	// If want to prerender all paths, should be used the below commented code
	/* const res = await getOverview(type)
	const { allChains } = res
	const paths = allChains.map((chain) => ({
		params: { type, chain: chain.toLowerCase() }
	}))
	return { paths, fallback: 'blocking' }	*/

	// If want to prerender all paths, comment the code below and uncomment the code above instead of commenting .slice(0, 5) (more efficient above)
	const allChainsData = await getStaticPropsByType(type)({ params: { type } })
	const paths = allChainsData.props.protocols
		.sort((a, b) => {
			return b.total24h - a.total24h
		})
		//.slice(0, 5)
		.map((chain) => ({
			params: { type, chain: chain.name.toLowerCase() }
		}))

	// { fallback: false } means other routes should 404
	return { paths, fallback: 'blocking' }
}

export { default, getStaticProps } from '../'
