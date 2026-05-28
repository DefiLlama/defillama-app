import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadProxy(allowedOrigins = '') {
	vi.resetModules()
	vi.stubEnv('CORS_ALLOWED_ORIGINS', allowedOrigins)
	return import('~/proxy')
}

function apiRequest(origin: string, method = 'POST') {
	return new NextRequest('https://defillama.com/api/charts/protocol', {
		method,
		headers: { origin }
	})
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
