import { describe, expect, it } from 'vitest'
import { getInitialAlertArtifactHour } from '~/containers/LlamaAI/components/AlertArtifact'

describe('AlertArtifact', () => {
	it('moves blocked proposed hours to the first valid local hour', () => {
		expect(getInitialAlertArtifactHour(7, 'Etc/GMT-7')).toBe(0)
		expect(getInitialAlertArtifactHour(10, 'Etc/GMT-7')).toBe(10)
	})
})
