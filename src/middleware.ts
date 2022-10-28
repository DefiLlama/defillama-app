import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ANNOUNCEMENT } from './components/Announcement'

export function middleware(request: NextRequest) {
	const response = NextResponse.next()

	const requestUrl = request.url.startsWith('http://localhost:3000/')
		? request.url.split('http://localhost:3000/')[1]
		: request.url.split('.com/')[1]

	console.log(requestUrl)

	const { key, value } = ANNOUNCEMENT[requestUrl.startsWith('yields') ? 'yields' : 'defi']

	// Getting cookies from the request
	const currentKey = request.cookies.get(key)

	if (currentKey !== value) {
		// return response
		return NextResponse.rewrite(new URL(`${request.url}?announcement=true`, request.url))
	}

	return response
}

export const config = {
	matcher: ['/', '/yields']
}
