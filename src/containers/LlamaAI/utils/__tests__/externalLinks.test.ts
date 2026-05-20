import { describe, expect, it } from 'vitest'
import {
	getLlamaAIExternalAllowlistHosts,
	isLlamaAIExternalLink,
	parseLlamaAIExternalAllowlistSnapshot
} from '~/containers/LlamaAI/utils/externalLinks'

describe('externalLinks', () => {
	it('does not gate relative, internal, or trusted links', () => {
		expect(isLlamaAIExternalLink('/protocol/aave')).toBe(false)
		expect(isLlamaAIExternalLink('#section')).toBe(false)
		expect(isLlamaAIExternalLink('?tab=overview')).toBe(false)
		expect(isLlamaAIExternalLink('https://defillama.com/protocol/aave')).toBe(false)
		expect(isLlamaAIExternalLink('https://www.defillama.com/protocol/aave')).toBe(false)
		expect(isLlamaAIExternalLink('https://x.com/DefiLlama')).toBe(false)
		expect(isLlamaAIExternalLink('https://github.com/DefiLlama/defillama-app')).toBe(false)
		expect(isLlamaAIExternalLink('https://api.llama.fi/lite/charts/Ethereum')).toBe(false)
	})

	it('gates off-domain http links unless the host is user-allowed', () => {
		expect(isLlamaAIExternalLink('https://example.com/report')).toBe(true)
		expect(isLlamaAIExternalLink('//example.com/report')).toBe(true)
		expect(isLlamaAIExternalLink('https://example.com/report', new Set(['example.com']))).toBe(false)
		expect(isLlamaAIExternalLink('mailto:security@example.com')).toBe(false)
		expect(isLlamaAIExternalLink('not a url')).toBe(false)
	})

	it('normalizes, dedupes, and caps user allowlist hosts', () => {
		const hosts = [' Example.com. ', 'example.com', '', 123, 'Sub.Example.com']
		expect(getLlamaAIExternalAllowlistHosts(hosts)).toEqual(['example.com', 'sub.example.com'])

		const manyHosts = Array.from({ length: 205 }, (_, index) => `host-${index}.example.com`)
		const capped = getLlamaAIExternalAllowlistHosts(manyHosts)
		expect(capped).toHaveLength(200)
		expect(capped[0]).toBe('host-5.example.com')
		expect(capped.at(-1)).toBe('host-204.example.com')
	})

	it('parses allowlist snapshots for renderer subscriptions', () => {
		expect(parseLlamaAIExternalAllowlistSnapshot('["Example.com."]')).toEqual(new Set(['example.com']))
		expect(parseLlamaAIExternalAllowlistSnapshot('not-json')).toEqual(new Set())
	})
})
