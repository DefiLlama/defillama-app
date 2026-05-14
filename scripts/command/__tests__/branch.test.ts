import { describe, expect, it } from 'vitest'
import { detectBranchName, normalizeBranchName } from '../branch'
import { testEnv } from './testEnv'

describe('branch detection', () => {
	it('uses the shared CI fallback chain', () => {
		expect(
			detectBranchName(
				testEnv({
					COOLIFY_BRANCH: 'coolify',
					GITHUB_REF: 'refs/heads/main'
				})
			)
		).toBe('coolify')
		expect(detectBranchName(testEnv({ GITHUB_REF: 'refs/heads/main' }))).toBe('main')
	})

	it('normalizes refs and ignores HEAD', () => {
		expect(normalizeBranchName('refs/tags/v1')).toBe('v1')
		expect(normalizeBranchName('refs/pull/1/merge')).toBe('pull/1/merge')
		expect(normalizeBranchName('HEAD')).toBe('')
	})
})
