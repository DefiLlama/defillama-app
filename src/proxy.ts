import { NextResponse, type NextRequest } from 'next/server'

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

export function proxy(request: NextRequest) {
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
	matcher: '/api/:path*'
}
