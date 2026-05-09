import { describe, expect, it } from 'vitest'
import { detectEmbed, validateEmbedConfig } from '../embedProviders'

describe('article embed providers', () => {
	it('normalizes common YouTube URLs to embed URLs', () => {
		expect(detectEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
			provider: 'youtube',
			url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
			sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			aspectRatio: '16/9'
		})

		expect(detectEmbed('https://youtu.be/dQw4w9WgXcQ?t=10')?.url).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
		expect(detectEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.url).toBe(
			'https://www.youtube.com/embed/dQw4w9WgXcQ'
		)
	})

	it('normalizes Twitter and X status URLs', () => {
		expect(detectEmbed('https://x.com/defillama/status/1234567890')).toEqual({
			provider: 'twitter',
			url: 'https://twitter.com/i/status/1234567890',
			sourceUrl: 'https://x.com/defillama/status/1234567890',
			aspectRatio: 'auto'
		})
	})

	it('converts Telegram post links to iframe embeds', () => {
		expect(detectEmbed('https://t.me/defillama_tg/42')).toEqual({
			provider: 'iframe',
			url: 'https://t.me/defillama_tg/42?embed=1&dark=auto',
			sourceUrl: 'https://t.me/defillama_tg/42',
			aspectRatio: 'auto'
		})
	})

	it('converts Flourish visualizations to embed URLs and allows Datawrapper iframes', () => {
		expect(detectEmbed('https://public.flourish.studio/visualisation/12345/')?.url).toBe(
			'https://public.flourish.studio/visualisation/12345/embed'
		)
		expect(detectEmbed('https://datawrapper.dwcdn.net/abcd1/3/')).toMatchObject({
			provider: 'iframe',
			url: 'https://datawrapper.dwcdn.net/abcd1/3/',
			aspectRatio: '16/9'
		})
	})

	it('rejects unsupported or unsafe URLs', () => {
		expect(detectEmbed('javascript:alert(1)')).toBeNull()
		expect(detectEmbed('https://example.com/chart')).toBeNull()
		expect(
			validateEmbedConfig({
				provider: 'iframe',
				url: 'https://example.com/chart',
				sourceUrl: 'https://example.com/chart'
			})
		).toBeNull()
	})

	it('validates and trims persisted embed configs', () => {
		const config = validateEmbedConfig({
			provider: 'iframe',
			url: 'https://datawrapper.dwcdn.net/abcd1/3/',
			sourceUrl: 'https://www.datawrapper.de/_/abcd1/',
			title: ` ${'A'.repeat(260)} `,
			caption: ` ${'B'.repeat(700)} `,
			aspectRatio: '4/3'
		})

		expect(config).toMatchObject({
			provider: 'iframe',
			url: 'https://datawrapper.dwcdn.net/abcd1/3/',
			sourceUrl: 'https://www.datawrapper.de/_/abcd1/',
			aspectRatio: '4/3'
		})
		expect(config?.title).toHaveLength(240)
		expect(config?.caption).toHaveLength(600)
	})
})
