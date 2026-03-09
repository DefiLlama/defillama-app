export function assertResponse(response: Response | null, message: string = 'Request failed'): Response {
	if (!response) {
		throw new Error(message)
	}
	if (!response.ok) {
		const statusLabel = `${response.status} ${response.statusText}`.trim()
		throw new Error(`${message} (${statusLabel})`)
	}
	return response
}
