import { describe, expect, it } from 'vitest'
import { createInitialStreamState, streamReducer } from '~/containers/LlamaAI/streamState'

describe('streamReducer', () => {
	it('preserves prior spawn progress metadata when later updates omit optional fields', () => {
		let state = createInitialStreamState()
		state = streamReducer(state, {
			type: 'UPSERT_SPAWN_PROGRESS',
			value: { id: 'agent-1', status: 'tool_call', tool: 'search', toolCount: 3, chartCount: 1 }
		})

		state = streamReducer(state, {
			type: 'UPSERT_SPAWN_PROGRESS',
			value: { id: 'agent-1', status: 'completed' }
		})

		expect(state.spawnProgress.get('agent-1')).toMatchObject({
			status: 'completed',
			tool: 'search',
			toolCount: 3,
			chartCount: 1
		})
	})

	it('keeps visible streaming todos when a transient empty snapshot arrives', () => {
		let state = streamReducer(createInitialStreamState(), { type: 'START_STREAM' })
		state = streamReducer(state, {
			type: 'SET_TODOS',
			value: [{ id: 'todo-1', content: 'Research TVL', status: 'in_progress' as const }]
		})

		state = streamReducer(state, { type: 'SET_TODOS', value: [] })

		expect(state.todos).toHaveLength(1)
	})

	it('allows empty todo snapshots to clear non-streaming state', () => {
		const state = {
			...createInitialStreamState(),
			todos: [{ id: 'todo-1', content: 'Research TVL', status: 'completed' as const }]
		}

		expect(streamReducer(state, { type: 'SET_TODOS', value: [] }).todos).toEqual([])
	})

	it('treats malformed todo snapshots as empty arrays', () => {
		const state = {
			...createInitialStreamState(),
			todos: [{ id: 'todo-1', content: 'Research TVL', status: 'completed' as const }]
		}

		expect(streamReducer(state, { type: 'SET_TODOS', value: null }).todos).toEqual([])
	})
})
