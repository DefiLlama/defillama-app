import { setPageBuildTimes } from '~/utils/cache-client'
import { getStaticPropsByType } from './index'
import { postRuntimeLogs } from '~/utils/async'

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
	const start = Date.now()
	const allChainsData = await getStaticPropsByType(type)({ params: { type } })
	const paths = allChainsData.props.protocols
		.sort((a, b) => {
			return b.total24h - a.total24h
		})
		//.slice(0, 5)
		.map((chain) => ({
			params: { type, chain: chain.name.toLowerCase() }
		}))
	const end = Date.now()

	if (end - start > 10_000) {
		await setPageBuildTimes(`adaptorPages:${type}:chains`, [end, `${(end - start).toFixed(0)}ms`])
		postRuntimeLogs(`[PREPARED] [${(end - start).toFixed(0)}ms] <adaptorPages:${type}:chains>`)
	}

	// { fallback: false } means other routes should 404
	return { paths, fallback: 'blocking' }
}

export { default, getStaticProps } from '../'
