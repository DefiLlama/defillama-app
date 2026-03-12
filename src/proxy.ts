import { NextResponse, type NextRequest } from 'next/server'
import { SUPERLUMINAL_PROTOCOL_IDS } from '~/containers/SuperLuminal/config'

const ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
const DEFAULT_ALLOWED_HEADERS = 'Content-Type,Authorization,X-Requested-With'
const MAX_AGE_SECONDS = '86400'
const rawAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS ?? ''
const allowedOrigins = rawAllowedOrigins
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean)
const allowAnyOrigin = allowedOrigins.includes('*')

function appendVaryHeader(response: NextResponse, value: string) {
	const currentValue = response.headers.get('Vary')
	if (!currentValue) {
		response.headers.set('Vary', value)
		return
	}

	const parts = currentValue.split(',').map((part) => part.trim())
	if (!parts.includes(value)) {
		response.headers.set('Vary', `${currentValue}, ${value}`)
	}
}

function resolveAllowedOrigin(origin: string | null): string | null {
	if (allowAnyOrigin) {
		return '*'
	}

	if (!origin) {
		return null
	}

	return allowedOrigins.includes(origin) ? origin : null
}

function appendPreflightVaryHeaders(response: NextResponse) {
	appendVaryHeader(response, 'Access-Control-Request-Method')
	appendVaryHeader(response, 'Access-Control-Request-Headers')
}

function applyCorsHeaders(response: NextResponse, request: NextRequest, allowedOrigin: string) {
	response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
	response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
	response.headers.set(
		'Access-Control-Allow-Headers',
		request.headers.get('access-control-request-headers') ?? DEFAULT_ALLOWED_HEADERS
	)
	response.headers.set('Access-Control-Max-Age', MAX_AGE_SECONDS)

	if (!allowAnyOrigin) {
		appendVaryHeader(response, 'Origin')
	}
}

function getSuperluminalRewrite(request: NextRequest) {
	const dashboardId = process.env.NEXT_PUBLIC_SUPERLUMINAL_DASHBOARD_ID
	if (!dashboardId) return null

	const { pathname } = request.nextUrl

	if (pathname === '/') {
		return new URL('/superluminal', request.url)
	}

	if (pathname === '/all') {
		return new URL('/superluminal/all', request.url)
	}

	const segment = pathname.slice(1)
	if (SUPERLUMINAL_PROTOCOL_IDS.includes(segment)) {
		return new URL(`/superluminal/${segment}`, request.url)
	}

	return null
}

export function proxy(request: NextRequest) {
	const superluminalRewrite = getSuperluminalRewrite(request)
	if (superluminalRewrite) {
		return NextResponse.rewrite(superluminalRewrite)
	}

	const origin = request.headers.get('origin')
	const allowedOrigin = resolveAllowedOrigin(origin)

	if (origin && !allowedOrigin) {
		const response = new NextResponse('CORS origin denied', { status: 403 })
		appendVaryHeader(response, 'Origin')
		if (request.method === 'OPTIONS') {
			appendPreflightVaryHeaders(response)
		}
		return response
	}

	if (request.method === 'OPTIONS') {
		const response = new NextResponse(null, { status: 204 })

		if (allowedOrigin) {
			applyCorsHeaders(response, request, allowedOrigin)
			appendPreflightVaryHeaders(response)
		}

		return response
	}

	const response = NextResponse.next()

	if (allowedOrigin) {
		applyCorsHeaders(response, request, allowedOrigin)
	}

	return response
}

export const config = {
	matcher: ['/api/:path*', '/', '/all', '/etherfi', '/spark', '/maple', '/berachain']
}
