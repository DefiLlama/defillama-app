import { proxyJsonRoute } from '../proxy'
import type { ApiRouteDefinition } from '../types'

const SLOW_CACHE = 'public, s-maxage=300, stale-while-revalidate=600'
const FAST_CACHE = 'public, s-maxage=60, stale-while-revalidate=300'

function flareRoute(name: string, cacheControl: string): ApiRouteDefinition {
	const base = process.env.IR_SERVER_URL
	return proxyJsonRoute({
		route: `/api/public/flare/${name}`,
		cacheControl,
		upstreamUrl: () => (base ? `${base}/api/flare/${name}` : null)
	})
}

export const flareMetadata = flareRoute('metadata', SLOW_CACHE)
export const flareNetwork = flareRoute('network', FAST_CACHE)
export const flareOverview = flareRoute('overview', FAST_CACHE)
export const flareStaking = flareRoute('staking', FAST_CACHE)
export const flareSupply = flareRoute('supply', FAST_CACHE)
export const flareTokenomics = flareRoute('tokenomics', FAST_CACHE)
