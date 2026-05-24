import { describe, expect, it } from 'vitest'
import { getToolLabel, TOOL_ICONS, TOOL_LABELS } from '~/containers/LlamaAI/toolMetadata'

describe('toolMetadata', () => {
	it('returns configured labels and icon metadata', () => {
		expect(TOOL_LABELS.execute_sql).toBe('Querying database')
		expect(getToolLabel('execute_sql')).toBe('Querying database')
		expect(TOOL_ICONS.generate_chart).toEqual({ icon: 'bar-chart-2', color: '#f59e0b' })
	})

	it('formats unknown tool names into a readable fallback label', () => {
		expect(getToolLabel('new_backend_tool')).toBe('New Backend Tool')
	})
})
