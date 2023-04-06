import { fetchWithErrorLogging } from '../async'

const fetch = fetchWithErrorLogging

export const fetcher = (input: RequestInfo, init?: RequestInit) => fetch(input, init).then((res) => res.json())

export class NetworkError extends Error {
	status

	constructor(status: number, message: string) {
		super(message)

		this.status = status

		Object.setPrototypeOf(this, NetworkError.prototype)
	}
}

export const fetcherWErrorHandling = async (input: RequestInfo, init?: RequestInit) => {
	const res = await fetch(input, init)

	// thrown error will be handled by useSWR and asigned to error object
	if (!res.ok) {
		const error = new NetworkError(res.status, await res.json())
		throw error
	}

	return res.json()
}

export const arrayFetcher = (urlArr: string[]) => Promise.all(urlArr.map((url) => fetcher(url)))

export const retrySWR = (error, key, config, revalidate, { retryCount }) => {
	// Only retry up to 3 times.
	if (retryCount >= 3) return
	// Retry after 200 miliseconds.
	setTimeout(() => revalidate({ retryCount }), 200)
}
