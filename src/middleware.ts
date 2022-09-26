import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ANNOUNCEMENT_KEY, ANNOUNCEMENT_VALUE } from './components/Announcement'

export function middleware(request: NextRequest) {
	const response = NextResponse.next()

	// Getting cookies from the request
	const currentKey = request.cookies.get(ANNOUNCEMENT_KEY)

	if (currentKey !== ANNOUNCEMENT_VALUE) {
		return NextResponse.rewrite(new URL('/?announcement=true', request.url))
		// return response
	}

	return response
}

export const config = {
	matcher: '/'
}
