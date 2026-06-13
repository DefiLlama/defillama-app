import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

function stubProxyEnv(allowedOrigins = '', investorsSite = '', investorsPreview = '') {
	vi.stubEnv('CORS_ALLOWED_ORIGINS', allowedOrigins)
	vi.stubEnv('NEXT_PUBLIC_INVESTORS_SITE', investorsSite)
	vi.stubEnv('NEXT_PUBLIC_INVESTORS_PREVIEW', investorsPreview)
	vi.stubEnv('NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID', '')
}

async function loadProxy(allowedOrigins = '', investorsSite = '', investorsPreview = '') {
	vi.resetModules()
	stubProxyEnv(allowedOrigins, investorsSite, investorsPreview)
	return import('~/proxy')
}

async function loadInvestorsConfig(investorsSite: string, investorsPreview = '') {
	vi.resetModules()
	stubProxyEnv('', investorsSite, investorsPreview)
	return import('~/containers/Investors/config')
}

async function loadProxyWithInvestorsConfig(investorsSite: string, investorsPreview = '') {
	vi.resetModules()
	stubProxyEnv('', investorsSite, investorsPreview)
	const [proxyModule, investorsConfig] = await Promise.all([import('~/proxy'), import('~/containers/Investors/config')])

	return { proxy: proxyModule.proxy, investorsConfig }
}

function apiRequest(origin: string, method = 'POST', path = '/api/private/token-usage/BTC') {
	return new NextRequest(`https://defillama.com${path}`, {
		method,
		headers: { origin }
	})
}

function pageRequest(url: string) {
	return new NextRequest(url, {
		headers: { host: new URL(url).host }
	})
}

function rewriteUrl(response: Response) {
	return response.headers.get('x-middleware-rewrite')
}

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('api proxy CORS', () => {
	it('allows same-origin API POST requests with an Origin header', async () => {
		const { proxy } = await loadProxy()

		const response = proxy(apiRequest('https://defillama.com'))

		expect(response.status).not.toBe(403)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://defillama.com')
	})

	it('allows configured cross-origin API requests', async () => {
		const { proxy } = await loadProxy('https://integrator.example')

		const response = proxy(apiRequest('https://integrator.example'))

		expect(response.status).not.toBe(403)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://integrator.example')
	})

	it('denies unconfigured cross-origin API requests', async () => {
		const { proxy } = await loadProxy('https://integrator.example')

		const response = proxy(apiRequest('https://unknown.example'))

		expect(response.status).toBe(403)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
	})

	it('allows any origin for canonical public API requests without varying by Origin', async () => {
		const { proxy } = await loadProxy('https://integrator.example')

		const response = proxy(apiRequest('https://unknown.example', 'GET', '/api/public/protocols/charts'))

		expect(response.status).not.toBe(403)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
		expect(response.headers.get('Vary') ?? '').not.toContain('Origin')
	})

	it('keeps configured-origin CORS for private and dynamic API requests', async () => {
		const { proxy } = await loadProxy('https://integrator.example')

		const privateResponse = proxy(apiRequest('https://unknown.example', 'GET', '/api/private/token-usage/BTC'))
		const dynamicResponse = proxy(
			apiRequest('https://unknown.example', 'GET', '/api/dynamic/dashboard/public-id/stream')
		)

		expect(privateResponse.status).toBe(403)
		expect(dynamicResponse.status).toBe(403)
		expect(privateResponse.headers.get('Access-Control-Allow-Origin')).toBeNull()
		expect(dynamicResponse.headers.get('Access-Control-Allow-Origin')).toBeNull()
	})

	it('handles preflight for public, private, and dynamic API groups', async () => {
		const { proxy } = await loadProxy('https://integrator.example')

		const publicResponse = proxy(apiRequest('https://unknown.example', 'OPTIONS', '/api/public/protocols/charts'))
		const privateResponse = proxy(apiRequest('https://integrator.example', 'OPTIONS', '/api/private/token-usage/BTC'))
		const dynamicResponse = proxy(
			apiRequest('https://integrator.example', 'OPTIONS', '/api/dynamic/dashboard/public-id/stream')
		)

		expect(publicResponse.status).toBe(204)
		expect(publicResponse.headers.get('Access-Control-Allow-Origin')).toBe('*')
		expect(publicResponse.headers.get('Vary') ?? '').not.toContain('Origin')
		expect(privateResponse.status).toBe(204)
		expect(privateResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://integrator.example')
		expect(privateResponse.headers.get('Vary')).toContain('Origin')
		expect(dynamicResponse.status).toBe(204)
		expect(dynamicResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://integrator.example')
		expect(dynamicResponse.headers.get('Vary')).toContain('Origin')
	})
})

describe('investors proxy routing', () => {
	it('keeps the enterprise root on the landing page', async () => {
		const { proxy } = await loadProxy('', 'enterprise')

		const response = proxy(pageRequest('https://enterprise.defillama.com/'))

		expect(rewriteUrl(response)).toBe('https://enterprise.defillama.com/investors')
	})

	it('serves only active projects locally on the enterprise domain', async () => {
		const { proxy, investorsConfig } = await loadProxyWithInvestorsConfig('enterprise', 'true')

		for (const projectId of investorsConfig.INVESTORS_PROTOCOL_IDS) {
			const response = proxy(pageRequest(`https://enterprise.defillama.com/${projectId}`))

			expect(rewriteUrl(response)).toBe(`https://enterprise.defillama.com/investors/${projectId}`)
		}

		for (const projectId of investorsConfig.INVESTORS_LANDING_PROTOCOL_IDS.filter(
			(projectId) => !investorsConfig.INVESTORS_PROTOCOL_IDS.includes(projectId)
		)) {
			const response = proxy(pageRequest(`https://enterprise.defillama.com/${projectId}`))

			expect(rewriteUrl(response)).toBe('https://enterprise.defillama.com/404')
		}

		for (const projectId of ['flare', 'thorchain']) {
			const response = proxy(pageRequest(`https://enterprise.defillama.com/${projectId}`))

			expect(rewriteUrl(response)).toBe('https://enterprise.defillama.com/404')
		}
	})

	it('serves active investor projects on the investors domain without preview projects', async () => {
		const { proxy, investorsConfig } = await loadProxyWithInvestorsConfig('investors')

		const rootResponse = proxy(pageRequest('https://investors.defillama.com/'))

		expect(rewriteUrl(rootResponse)).toBe('https://investors.defillama.com/investors')

		for (const projectId of investorsConfig.INVESTORS_PROTOCOL_IDS) {
			const response = proxy(pageRequest(`https://investors.defillama.com/${projectId}`))

			expect(rewriteUrl(response)).toBe(`https://investors.defillama.com/investors/${projectId}`)
		}

		for (const projectId of investorsConfig.INVESTORS_LANDING_PROTOCOL_IDS.filter(
			(projectId) => !investorsConfig.INVESTORS_PROTOCOL_IDS.includes(projectId)
		)) {
			const response = proxy(pageRequest(`https://investors.defillama.com/${projectId}`))

			expect(rewriteUrl(response)).toBe('https://investors.defillama.com/404')
		}

		for (const projectId of ['flare', 'thorchain']) {
			const response = proxy(pageRequest(`https://investors.defillama.com/${projectId}`))

			expect(rewriteUrl(response)).toBe('https://investors.defillama.com/404')
		}
	})

	it('serves preview investor projects on the investors domain when preview is enabled', async () => {
		const { proxy, investorsConfig } = await loadProxyWithInvestorsConfig('investors', 'true')

		expect(investorsConfig.INVESTORS_PROTOCOL_IDS).toEqual(['spark', 'sonic', 'near', 'flare', 'thorchain'])

		for (const projectId of investorsConfig.INVESTORS_PROTOCOL_IDS) {
			const response = proxy(pageRequest(`https://investors.defillama.com/${projectId}`))

			expect(rewriteUrl(response)).toBe(`https://investors.defillama.com/investors/${projectId}`)
		}
	})
})

describe('investors landing links', () => {
	it('shows investor-domain dashboards as external enterprise cards', async () => {
		const config = await loadInvestorsConfig('enterprise')
		const [investorsHost] = config.INVESTORS_SITES.investors.hosts
		if (!investorsHost) throw new Error('Investors site host is required')
		const investorDomainLandingProjectIds = [...config.INVESTORS_SITES.investors.landingProjectIds]
		const enterpriseDomainProjectIds = [...config.INVESTORS_SITES.enterprise.projectIds]

		expect(config.INVESTORS_LANDING_PROJECTS.map((project) => project.id)).toEqual([
			...investorDomainLandingProjectIds,
			...enterpriseDomainProjectIds
		])
		expect(config.INVESTORS_PROTOCOL_IDS).toEqual(enterpriseDomainProjectIds)

		for (const projectId of investorDomainLandingProjectIds) {
			expect(config.getInvestorsLandingProjectHref(projectId)).toBe(`https://${investorsHost}/${projectId}`)
			expect(config.isInvestorsLandingProjectExternal(projectId)).toBe(true)
		}

		for (const projectId of enterpriseDomainProjectIds) {
			expect(config.getInvestorsLandingProjectHref(projectId)).toBe(`/${projectId}`)
			expect(config.isInvestorsLandingProjectExternal(projectId)).toBe(false)
		}
	})

	it('keeps investor-domain landing cards local', async () => {
		const config = await loadInvestorsConfig('investors')
		const investorDomainProjectIds = [...config.INVESTORS_SITES.investors.projectIds]
		const investorDomainLandingProjectIds = [...config.INVESTORS_SITES.investors.landingProjectIds]

		expect(config.INVESTORS_LANDING_PROJECTS.map((project) => project.id)).toEqual(investorDomainLandingProjectIds)
		expect(config.INVESTORS_PROTOCOL_IDS).toEqual(investorDomainProjectIds)

		for (const projectId of investorDomainProjectIds) {
			expect(config.getInvestorsLandingProjectHref(projectId)).toBe(`/${projectId}`)
			expect(config.isInvestorsLandingProjectExternal(projectId)).toBe(false)
		}
	})

	it('keeps coming-soon projects on the investors landing page but not routable as dashboards', async () => {
		const { proxy, investorsConfig } = await loadProxyWithInvestorsConfig('investors')

		expect(investorsConfig.INVESTORS_COMING_SOON_PROJECTS.map((project) => project.id)).toEqual(['berachain'])
		expect(investorsConfig.INVESTORS_LANDING_PROJECTS.map((project) => project.id)).toEqual(['spark', 'sonic', 'near'])

		const response = proxy(pageRequest('https://investors.defillama.com/berachain'))

		expect(rewriteUrl(response)).toBe('https://investors.defillama.com/404')
	})

	it('keeps preview investor dashboards off the investors landing page', async () => {
		const config = await loadInvestorsConfig('investors', 'true')

		expect(config.INVESTORS_PROTOCOL_IDS).toEqual(['spark', 'sonic', 'near', 'flare', 'thorchain'])
		expect(config.INVESTORS_LANDING_PROJECTS.map((project) => project.id)).toEqual(['spark', 'sonic', 'near'])
		expect(config.INVESTORS_COMING_SOON_PROJECTS.map((project) => project.id)).toEqual(['berachain'])

		for (const projectId of ['flare', 'thorchain'] as const) {
			expect(config.getInvestorsLandingProjectHref(projectId)).toBe(`/${projectId}`)
			expect(config.isInvestorsLandingProjectExternal(projectId)).toBe(false)
		}
	})
})
