export function assertResponse(response: Response | null, message: string = 'Request failed'): Response {
	if (!response) {
		throw new Error(message)
	}
	return response
}
