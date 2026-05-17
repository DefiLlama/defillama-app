import type { NextApiResponse } from 'next'
import { vi } from 'vitest'

export type MockNextApiResponse = NextApiResponse & {
	setHeader: ReturnType<typeof vi.fn>
	status: ReturnType<typeof vi.fn>
	json: ReturnType<typeof vi.fn>
	send: ReturnType<typeof vi.fn>
	write: ReturnType<typeof vi.fn>
	end: ReturnType<typeof vi.fn>
}

export function createMockNextApiResponse(): MockNextApiResponse {
	const res = {
		statusCode: 200,
		setHeader: vi.fn(),
		status: vi.fn(),
		json: vi.fn(),
		send: vi.fn(),
		write: vi.fn(),
		end: vi.fn()
	} as unknown as MockNextApiResponse

	res.setHeader.mockReturnValue(res)
	res.status.mockImplementation((statusCode: number) => {
		res.statusCode = statusCode
		return res
	})
	res.json.mockReturnValue(res)
	res.send.mockReturnValue(res)
	res.write.mockReturnValue(true)
	res.end.mockReturnValue(res)

	return res
}
