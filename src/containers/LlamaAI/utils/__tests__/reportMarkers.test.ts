import { describe, expect, it } from 'vitest'
import { removeReportStartMarkers, stripBeforeReportStart } from '~/containers/LlamaAI/utils/reportMarkers'

describe('reportMarkers', () => {
	it('strips preamble before the report marker', () => {
		expect(stripBeforeReportStart('thinking\n[REPORT_START]\n# Report')).toBe('# Report')
		expect(stripBeforeReportStart('# Report')).toBe('# Report')
	})

	it('removes report markers from copied content', () => {
		expect(removeReportStartMarkers('[REPORT_START]\n# Report\n[REPORT_START]Done')).toBe('# Report\nDone')
	})
})
