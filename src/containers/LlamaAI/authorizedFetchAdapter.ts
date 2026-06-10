export type AuthorizedFetch = (url: string, init?: RequestInit) => Promise<Response | null>

function getAuthorizedFetchInput(input: RequestInfo | URL, init?: RequestInit) {
	if (!(input instanceof Request)) {
		const url = typeof input === 'string' ? input : input.toString()
		return { url, init }
	}

	const mergedHeaders = new Headers(input.headers)
	if (init?.headers) {
		new Headers(init.headers).forEach((value, key) => {
			mergedHeaders.set(key, value)
		})
	}

	const mergedInit: RequestInit = {
		method: init?.method ?? input.method,
		headers: mergedHeaders,
		body: init?.body ?? input.body,
		cache: init?.cache ?? input.cache,
		credentials: init?.credentials ?? input.credentials,
		integrity: init?.integrity ?? input.integrity,
		keepalive: init?.keepalive ?? input.keepalive,
		mode: init?.mode ?? input.mode,
		priority: init?.priority,
		redirect: init?.redirect ?? input.redirect,
		referrer: init?.referrer ?? input.referrer,
		referrerPolicy: init?.referrerPolicy ?? input.referrerPolicy,
		signal: init?.signal ?? input.signal,
		window: init?.window
	}

	return { url: input.url, init: mergedInit }
}

export function authorizedFetchAsFetch(authorizedFetch: AuthorizedFetch): typeof fetch {
	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = getAuthorizedFetchInput(input, init)
		const response = await authorizedFetch(request.url, request.init)
		if (!response) {
			throw new Error('Authorized request failed')
		}
		return response
	}
}
