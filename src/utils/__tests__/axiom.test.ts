import { afterEach, describe, expect, it, vi } from 'vitest'

const axiomMock = vi.hoisted(() => {
	const ingest = vi.fn(async (_dataset: string, _events: Record<string, unknown>[]) => undefined)
	const flush = vi.fn(async () => undefined)
	const Axiom = vi.fn(function () {
		return { ingest, flush }
	})
	return { Axiom, ingest, flush }
})

vi.mock('@axiomhq/js', () => ({ Axiom: axiomMock.Axiom }))

async function flushPromises() {
	await Promise.resolve()
	await Promise.resolve()
}

describe('Axiom outbound logging', () => {
	afterEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
		axiomMock.Axiom.mockClear()
		axiomMock.ingest.mockClear()
		axiomMock.flush.mockClear()
	})

	it('parses pro API v2 URLs without exposing the key segment', async () => {
		const { parseAxiomOutboundUrl } = await import('../axiom')

		expect(parseAxiomOutboundUrl('https://pro-api.llama.fi/[REDACTED]/api/v2/chains')).toEqual({
			domain: 'pro-api.llama.fi',
			section: 'api',
			subRoute: 'chains'
		})
	})

	it('parses pro API section URLs', async () => {
		const { parseAxiomOutboundUrl } = await import('../axiom')

		expect(parseAxiomOutboundUrl('https://pro-api.llama.fi/[REDACTED]/rwa/list')).toEqual({
			domain: 'pro-api.llama.fi',
			section: 'rwa',
			subRoute: 'list'
		})
	})

	it('parses direct host URLs', async () => {
		const { parseAxiomOutboundUrl } = await import('../axiom')

		expect(parseAxiomOutboundUrl('https://api.llama.fi/protocols')).toEqual({
			domain: 'api.llama.fi',
			subRoute: 'protocols'
		})
	})

	it('applies the v2 subRoute shim to direct host URLs', async () => {
		const { parseAxiomOutboundUrl } = await import('../axiom')

		expect(parseAxiomOutboundUrl('https://api.llama.fi/v2/historicalChainTvl/Ethereum')).toEqual({
			domain: 'api.llama.fi',
			subRoute: 'historicalChainTvl'
		})
	})

	it('returns null for invalid URLs', async () => {
		const { parseAxiomOutboundUrl } = await import('../axiom')

		expect(parseAxiomOutboundUrl('not a url')).toBeNull()
	})

	it('does not instantiate Axiom when AXIOM_TOKEN is missing', async () => {
		const { logOutboundToAxiom } = await import('../axiom')

		logOutboundToAxiom({
			sanitizedUrl: 'https://api.llama.fi/protocols',
			method: 'GET',
			durationMs: 12,
			httpStatus: 200,
			status: 'success'
		})
		await flushPromises()

		expect(axiomMock.Axiom).not.toHaveBeenCalled()
		expect(axiomMock.ingest).not.toHaveBeenCalled()
	})

	it('ingests completed response metadata without URLs, queries, or API keys', async () => {
		vi.stubEnv('AXIOM_TOKEN', 'axiom-token')
		vi.stubEnv('AXIOM_DATASET', 'custom-usage')
		const { logOutboundToAxiom } = await import('../axiom')

		logOutboundToAxiom({
			sanitizedUrl: 'https://pro-api.llama.fi/[REDACTED]/api/v2/chains?api_key=secret',
			method: 'GET',
			durationMs: 42,
			responseBytes: 123,
			httpStatus: 500,
			status: 'http_error'
		})

		await vi.waitFor(() => {
			expect(axiomMock.Axiom).toHaveBeenCalledWith({ token: 'axiom-token', onError: expect.any(Function) })
			expect(axiomMock.ingest).toHaveBeenCalledWith('custom-usage', [
				expect.objectContaining({
					source: 'app',
					domain: 'pro-api.llama.fi',
					section: 'api',
					subRoute: 'chains',
					method: 'GET',
					durationMs: 42,
					responseBytes: 123,
					httpStatus: 500,
					status: 'http_error',
					_time: expect.any(String)
				})
			])
		})

		const ingestCall = axiomMock.ingest.mock.calls[0]
		if (!ingestCall) throw new Error('missing Axiom ingest call')
		const event = ingestCall[1][0]
		expect(event).not.toHaveProperty('url')
		expect(JSON.stringify(event)).not.toContain('secret')
		expect(JSON.stringify(event)).not.toContain('[REDACTED]')
	})
})
