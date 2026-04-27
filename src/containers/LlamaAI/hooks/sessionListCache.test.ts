import { describe, expect, it } from 'vitest'
import type { ChatSession, ResearchUsage } from '~/containers/LlamaAI/types'
import {
	flattenSessionListData,
	mapSessionListPage,
	mergeOptimisticSessions,
	moveSessionToTopInInfiniteData,
	prependSessionToInfiniteData,
	removeSessionsFromInfiniteData,
	updateSessionInInfiniteData,
	type SessionListInfiniteData,
	type SessionListPage
} from './sessionListCache'

const usage: ResearchUsage = {
	remainingUsage: 1,
	limit: 2,
	period: 'daily',
	resetTime: null
}

function session(sessionId: string, title = sessionId): ChatSession {
	return {
		sessionId,
		title,
		createdAt: '2026-04-26T00:00:00.000Z',
		lastActivity: '2026-04-26T00:00:00.000Z',
		isActive: true
	}
}

function page(sessions: ChatSession[], nextOffset?: number): SessionListPage {
	return {
		sessions,
		usage,
		hasMore: nextOffset !== undefined,
		nextOffset
	}
}

function data(pages: SessionListPage[]): SessionListInfiniteData {
	return {
		pages,
		pageParams: pages.map((_, index) => index * 200)
	}
}

describe('sessionListCache', () => {
	it('maps the sessions response page contract', () => {
		const first = session('first')
		const result = mapSessionListPage({
			sessions: [first],
			hasMore: true,
			nextOffset: 200,
			usage: {
				research_report: usage
			}
		})

		expect(result).toEqual({
			sessions: [first],
			usage,
			hasMore: true,
			nextOffset: 200
		})
	})

	it('flattens appended pages and keeps the first duplicate session', () => {
		const first = session('first', 'First')
		const duplicate = session('first', 'Duplicate')
		const second = session('second', 'Second')

		const result = flattenSessionListData(data([page([first]), page([duplicate, second])]))

		expect(result.sessions).toEqual([first, second])
		expect(result.usage).toBe(usage)
	})

	it('keeps optimistic sessions ahead of the first fetched page until the real session appears', () => {
		const fake = { ...session('fake'), isOptimistic: true }
		const first = session('first')

		const merged = mergeOptimisticSessions(page([first]), data([page([fake])]))
		expect(merged.sessions).toEqual([fake, first])

		const replaced = mergeOptimisticSessions(page([{ ...fake, isOptimistic: false }]), data([page([fake])]))
		expect(replaced.sessions).toEqual([{ ...fake, isOptimistic: false }])
	})

	it('prepends fake sessions to the first page', () => {
		const fake = { ...session('fake'), isOptimistic: true }
		const existing = session('existing')

		const result = prependSessionToInfiniteData(data([page([existing])]), fake)

		expect(flattenSessionListData(result).sessions).toEqual([fake, existing])
	})

	it('removes deleted sessions across loaded pages', () => {
		const first = session('first')
		const second = session('second')
		const third = session('third')

		const result = removeSessionsFromInfiniteData(
			data([page([first, second]), page([third])]),
			new Set(['second', 'third'])
		)

		expect(flattenSessionListData(result).sessions).toEqual([first])
	})

	it('updates matching sessions across loaded pages', () => {
		const first = session('first')
		const second = session('second')

		const result = updateSessionInInfiniteData(data([page([first]), page([second])]), 'second', (item) => ({
			...item,
			title: 'Updated',
			isPinned: true
		}))

		expect(flattenSessionListData(result).sessions).toEqual([first, { ...second, title: 'Updated', isPinned: true }])
	})

	it('moves a loaded session to the first position', () => {
		const first = session('first')
		const second = session('second')
		const third = session('third')

		const result = moveSessionToTopInInfiniteData(
			data([page([first]), page([second, third])]),
			'third',
			'2026-04-26T01:00:00.000Z'
		)

		expect(flattenSessionListData(result).sessions).toEqual([
			{ ...third, lastActivity: '2026-04-26T01:00:00.000Z' },
			first,
			second
		])
	})
})
