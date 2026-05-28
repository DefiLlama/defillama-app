import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadProxy(allowedOrigins = '', investorsSite = '') {
	vi.resetModules()
	vi.stubEnv('CORS_ALLOWED_ORIGINS', allowedOrigins)
	vi.stubEnv('NEXT_PUBLIC_INVESTORS_SITE', investorsSite)
	vi.stubEnv('NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID', '')
	return import('~/proxy')
}

async function loadInvestorsConfig(investorsSite: string) {
	vi.resetModules()
	vi.stubEnv('NEXT_PUBLIC_INVESTORS_SITE', investorsSite)
	vi.stubEnv('NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID', '')
	return import('~/containers/Investors/config')
}

function apiRequest(origin: string, method = 'POST') {
	return new NextRequest('https://defillama.com/api/charts/protocol', {
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
})

describe('investors proxy routing', () => {
	it('keeps the enterprise root on the landing page', async () => {
		const { proxy } = await loadProxy('', 'enterprise')

		const response = proxy(pageRequest('https://enterprise.defillama.com/'))

		expect(rewriteUrl(response)).toBe('https://enterprise.defillama.com/investors')
	})

	it('serves only Odyssey locally on the enterprise domain', async () => {
		const { proxy } = await loadProxy('', 'enterprise')

		const odysseyResponse = proxy(pageRequest('https://enterprise.defillama.com/odyssey-ecosystem'))
		const sparkResponse = proxy(pageRequest('https://enterprise.defillama.com/spark'))

		expect(rewriteUrl(odysseyResponse)).toBe('https://enterprise.defillama.com/investors/odyssey-ecosystem')
		expect(rewriteUrl(sparkResponse)).toBeNull()
	})

	it('serves the current investor projects on the investors domain', async () => {
		const { proxy } = await loadProxy('', 'investors')

		const rootResponse = proxy(pageRequest('https://investors.defillama.com/'))
		const sparkResponse = proxy(pageRequest('https://investors.defillama.com/spark'))
		const odysseyResponse = proxy(pageRequest('https://investors.defillama.com/odyssey-ecosystem'))

		expect(rewriteUrl(rootResponse)).toBe('https://investors.defillama.com/investors')
		expect(rewriteUrl(sparkResponse)).toBe('https://investors.defillama.com/investors/spark')
		expect(rewriteUrl(odysseyResponse)).toBeNull()
	})
})

describe('investors landing links', () => {
	it('shows investor-domain dashboards as external enterprise cards', async () => {
		const config = await loadInvestorsConfig('enterprise')

		expect(config.INVESTORS_LANDING_PROJECTS.map((project) => project.id)).toEqual([
			'spark',
			'sonic',
			'near',
			'odyssey-ecosystem'
		])
		expect(config.INVESTORS_PROTOCOL_IDS).toEqual(['odyssey-ecosystem'])
		expect(config.getInvestorsLandingProjectHref('spark')).toBe('https://investors.defillama.com/spark')
		expect(config.getInvestorsLandingProjectHref('sonic')).toBe('https://investors.defillama.com/sonic')
		expect(config.getInvestorsLandingProjectHref('near')).toBe('https://investors.defillama.com/near')
		expect(config.getInvestorsLandingProjectHref('odyssey-ecosystem')).toBe('/odyssey-ecosystem')
		expect(config.isInvestorsLandingProjectExternal('spark')).toBe(true)
		expect(config.isInvestorsLandingProjectExternal('odyssey-ecosystem')).toBe(false)
	})

	it('keeps investor-domain landing cards local', async () => {
		const config = await loadInvestorsConfig('investors')

		expect(config.INVESTORS_LANDING_PROJECTS.map((project) => project.id)).toEqual(['spark', 'sonic', 'near'])
		expect(config.getInvestorsLandingProjectHref('spark')).toBe('/spark')
		expect(config.isInvestorsLandingProjectExternal('spark')).toBe(false)
	})
})
