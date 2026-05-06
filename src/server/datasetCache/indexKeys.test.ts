import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { getDatasetIndexFileName } from './indexKeys'

describe('getDatasetIndexFileName', () => {
	it('keeps short encoded keys readable', () => {
		expect(getDatasetIndexFileName('btc')).toBe('btc.json')
		expect(getDatasetIndexFileName('staked eth')).toBe('staked%20eth.json')
	})

	it('uses a deterministic bounded filename for long keys', () => {
		const key = 'wrapped-'.repeat(80)
		const expectedHash = createHash('sha256').update(key).digest('hex')
		const fileName = getDatasetIndexFileName(key)

		expect(fileName).toBe(`${expectedHash}.json`)
		expect(Buffer.byteLength(fileName)).toBeLessThanOrEqual(240)
		expect(fileName).toBe(getDatasetIndexFileName(key))
	})

	it('measures encoded byte length before choosing the filename', () => {
		const key = '東京'.repeat(30)
		const fileName = getDatasetIndexFileName(key)
		const expectedHash = createHash('sha256').update(key).digest('hex')

		expect(Buffer.byteLength(`${encodeURIComponent(key)}.json`)).toBeGreaterThan(240)
		expect(fileName).toBe(`${expectedHash}.json`)
	})
})
