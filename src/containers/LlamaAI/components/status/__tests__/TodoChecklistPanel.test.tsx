import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TodoChecklistPanel } from '~/containers/LlamaAI/components/status/TodoChecklistPanel'

describe('TodoChecklistPanel', () => {
	it('preserves completed statuses for frozen plans', () => {
		const html = renderToStaticMarkup(
			<TodoChecklistPanel
				todos={[
					{ id: 'todo-1', content: 'Test item 1', status: 'completed' },
					{ id: 'todo-2', content: 'Test item 2', status: 'completed' }
				]}
			/>
		)

		expect(html).toContain('2/2 done')
		expect(html).toContain('Test item 1')
	})

	it('does not render elapsed time for live plans', () => {
		const html = renderToStaticMarkup(
			<TodoChecklistPanel
				isLive
				startTime={Date.UTC(2026, 0, 1)}
				todos={[{ id: 'todo-1', content: 'Test item 1', status: 'in_progress' }]}
			/>
		)

		expect(html).not.toContain('<time')
		expect(html).toContain('0/1 done')
	})
})
