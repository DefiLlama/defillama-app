import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
	const dashboardId = process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
	if (!dashboardId) return NextResponse.next()

	if (request.nextUrl.pathname === '/') {
		return NextResponse.rewrite(new URL('/superluminal', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: '/'
}
