import { NextRequest, NextResponse } from 'next/server'
import { SUPERLUMINAL_PROTOCOL_IDS } from '~/containers/SuperLuminal/config'

export function middleware(request: NextRequest) {
	const dashboardId = process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
	if (!dashboardId) return NextResponse.next()

	const { pathname } = request.nextUrl

	if (pathname === '/') {
		return NextResponse.rewrite(new URL('/superluminal', request.url))
	}

	if (pathname === '/all') {
		return NextResponse.rewrite(new URL('/superluminal/all', request.url))
	}

	const segment = pathname.slice(1)
	if (SUPERLUMINAL_PROTOCOL_IDS.includes(segment)) {
		return NextResponse.rewrite(new URL(`/superluminal/${segment}`, request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/', '/all', '/etherfi', '/spark', '/maple']
}
