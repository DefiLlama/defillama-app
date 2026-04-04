import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MAX_URL_LENGTH = 2048
const MAX_PATH_SEGMENT_LENGTH = 200
const RECURSIVE_ENCODING_PATTERN = /%25{3,}|%2525/i

export function middleware(request: NextRequest) {
	const url = request.nextUrl
	const pathname = url.pathname
	const fullUrl = request.url

	// Block excessively long URLs
	if (fullUrl.length > MAX_URL_LENGTH) {
		return new NextResponse('Bad Request: URL too long', { status: 400 })
	}

	// Block recursive URL encoding attacks (%25%25%25... or %2525)
	if (RECURSIVE_ENCODING_PATTERN.test(pathname) || RECURSIVE_ENCODING_PATTERN.test(fullUrl)) {
		return new NextResponse('Bad Request: Invalid URL encoding', { status: 400 })
	}

	// Block path segments that are too long (prevents ENAMETOOLONG errors)
	const segments = pathname.split('/')
	for (const segment of segments) {
		if (segment.length > MAX_PATH_SEGMENT_LENGTH) {
			return new NextResponse('Bad Request: Path segment too long', { status: 400 })
		}
	}

	// Block paths with excessive percent-encoding (more than 50% of path is encoded)
	const encodedCharCount = (pathname.match(/%[0-9A-Fa-f]{2}/g) || []).length
	if (encodedCharCount > 20 && encodedCharCount * 3 > pathname.length * 0.5) {
		return new NextResponse('Bad Request: Excessive URL encoding', { status: 400 })
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder files
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'
	]
}
