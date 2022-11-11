import { getOverview } from '~/api/categories/adaptors'

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

	const res = await getOverview(type)
	const { allChains } = res
	const paths = allChains.map((chain) => ({
		params: { type, chain: chain.toLowerCase() }
	}))

	// { fallback: false } means other routes should 404
	return { paths, fallback: 'false' }
}

export { default, getStaticProps } from '../'
