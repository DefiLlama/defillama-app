import { NextResponse, type NextRequest } from 'next/server'
import {
	DEFAULT_INVESTORS_PROTOCOL_ID,
	INVESTORS_LANDING_PROTOCOL_IDS,
	INVESTORS_PROTOCOL_IDS,
	SHOW_INVESTORS_COMING_SOON_PROJECT,
	isActiveInvestorsHost
} from '~/containers/Investors/config'

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

function resolveAllowedOrigin(origin: string | null, requestOrigin: string): string | null {
	if (allowAnyOrigin) {
		return '*'
	}

	if (!origin) {
		return null
	}

	if (origin === requestOrigin) {
		return origin
	}

	return allowedOrigins.includes(origin) ? origin : null
}

function appendPreflightVaryHeaders(response: NextResponse) {
	appendVaryHeader(response, 'Access-Control-Request-Method')
	appendVaryHeader(response, 'Access-Control-Request-Headers')
}

function applyCorsHeaders(
	response: NextResponse,
	request: NextRequest,
	allowedOrigin: string,
	varyByOrigin = !allowAnyOrigin
) {
	response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
	response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS)
	response.headers.set(
		'Access-Control-Allow-Headers',
		request.headers.get('access-control-request-headers') ?? DEFAULT_ALLOWED_HEADERS
	)
	response.headers.set('Access-Control-Max-Age', MAX_AGE_SECONDS)

	if (varyByOrigin) {
		appendVaryHeader(response, 'Origin')
	}
}

function isPublicApiPath(pathname: string) {
	return pathname.startsWith('/api/public/')
}

function getInvestorsRewrite(request: NextRequest) {
	if (!isActiveInvestorsHost(request.headers.get('host'))) return null

	const { pathname } = request.nextUrl
	const isSingleProject = INVESTORS_PROTOCOL_IDS.length === 1
	const hasLandingPage = INVESTORS_LANDING_PROTOCOL_IDS.length > 1 || SHOW_INVESTORS_COMING_SOON_PROJECT

	if (pathname === '/') {
		return new URL(
			isSingleProject && !hasLandingPage && DEFAULT_INVESTORS_PROTOCOL_ID
				? `/investors/${DEFAULT_INVESTORS_PROTOCOL_ID}`
				: '/investors',
			request.url
		)
	}

	if (pathname === '/all') {
		return new URL(
			isSingleProject && DEFAULT_INVESTORS_PROTOCOL_ID
				? `/investors/${DEFAULT_INVESTORS_PROTOCOL_ID}`
				: '/investors/all',
			request.url
		)
	}

	const segment = pathname.slice(1)
	if (INVESTORS_PROTOCOL_IDS.includes(segment)) {
		return new URL(`/investors/${segment}`, request.url)
	}

	return null
}

export function proxy(request: NextRequest) {
	const investorsRewrite = getInvestorsRewrite(request)
	if (investorsRewrite) {
		return NextResponse.rewrite(investorsRewrite)
	}

	const origin = request.headers.get('origin')
	const isPublicApi = isPublicApiPath(request.nextUrl.pathname)
	const allowedOrigin = isPublicApi ? '*' : resolveAllowedOrigin(origin, request.nextUrl.origin)

	if (!isPublicApi && origin && !allowedOrigin) {
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
			applyCorsHeaders(response, request, allowedOrigin, !isPublicApi && !allowAnyOrigin)
			appendPreflightVaryHeaders(response)
		}

		return response
	}

	const response = NextResponse.next()

	if (allowedOrigin) {
		applyCorsHeaders(response, request, allowedOrigin, !isPublicApi && !allowAnyOrigin)
	}

	return response
}

export const config = {
	matcher: [
		'/api/:path*',
		'/',
		'/all',
		'/etherfi',
		'/spark',
		'/maple',
		'/berachain',
		'/aave',
		'/sonic',
		'/near',
		'/flare',
		'/odyssey-ecosystem',
		'/thorchain'
	]
}
