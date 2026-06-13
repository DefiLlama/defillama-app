import type { NextApiResponse } from 'next'
import { vi } from 'vitest'

export type MockNextApiResponse = NextApiResponse & {
	setHeader: ReturnType<typeof vi.fn>
	hasHeader: ReturnType<typeof vi.fn>
	status: ReturnType<typeof vi.fn>
	json: ReturnType<typeof vi.fn>
	send: ReturnType<typeof vi.fn>
	revalidate: ReturnType<typeof vi.fn>
	write: ReturnType<typeof vi.fn>
	end: ReturnType<typeof vi.fn>
}

export function createMockNextApiResponse(): MockNextApiResponse {
	const headers = new Map<string, unknown>()
	const res = {
		statusCode: 200,
		setHeader: vi.fn(),
		hasHeader: vi.fn(),
		status: vi.fn(),
		json: vi.fn(),
		send: vi.fn(),
		revalidate: vi.fn(),
		write: vi.fn(),
		end: vi.fn()
	} as unknown as MockNextApiResponse

	res.setHeader.mockImplementation((name: string, value: unknown) => {
		headers.set(name.toLowerCase(), value)
		return res
	})
	res.hasHeader.mockImplementation((name: string) => headers.has(name.toLowerCase()))
	res.status.mockImplementation((statusCode: number) => {
		res.statusCode = statusCode
		return res
	})
	res.json.mockReturnValue(res)
	res.send.mockReturnValue(res)
	res.revalidate.mockResolvedValue(undefined)
	res.write.mockReturnValue(true)
	res.end.mockReturnValue(res)

	return res
}
