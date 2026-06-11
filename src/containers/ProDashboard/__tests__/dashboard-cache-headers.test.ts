import type { GetServerSidePropsContext, NextApiRequest } from 'next'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	fetchDashboardConfigMock,
	fetchDashboardConfigWithStatusMock,
	fetchProtocolsAndChainsMock,
	fetchAppMetadataMock
} = vi.hoisted(() => ({
	fetchDashboardConfigMock: vi.fn(),
	fetchDashboardConfigWithStatusMock: vi.fn(),
	fetchProtocolsAndChainsMock: vi.fn(),
	fetchAppMetadataMock: vi.fn()
}))

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: vi.fn(),
	withApiRouteTelemetry: (_route: string, handler: unknown) => handler,
	withServerSidePropsTelemetry: (_route: string, handler: unknown) => handler
}))

vi.mock('next/router', () => ({
	useRouter: () => ({ asPath: '/pro/dashboard-1' })
}))

vi.mock('~/components/Icon', () => ({
	Icon: () => null
}))

vi.mock('~/components/Link', () => ({
	BasicLink: () => null
}))

vi.mock('~/containers/ProDashboard/components/ProDashboardLoader', () => ({
	ProDashboardLoader: () => null
}))

vi.mock('~/containers/ProDashboard/hooks/useDashboardEngagement', () => ({
	useDashboardEngagement: () => ({ trackView: vi.fn() })
}))

vi.mock('~/containers/ProDashboard/ProDashboardAPIContext', () => ({
	ProDashboardAPIProvider: ({ children }: { children: ReactNode }) => children,
	useProDashboardDashboard: () => ({
		isLoadingDashboard: false,
		dashboardVisibility: 'public',
		currentDashboard: null,
		dashboardName: 'Dashboard'
	})
}))

vi.mock('~/containers/Subscription/auth', () => ({
	useAuthContext: () => ({
		isAuthenticated: false,
		loaders: { userLoading: false },
		hasActiveSubscription: false
	})
}))

vi.mock('~/layout', () => ({
	__esModule: true,
	default: ({ children }: { children: ReactNode }) => children
}))

vi.mock('~/containers/ProDashboard/queries.server', () => ({
	extractChartItems: vi.fn(() => []),
	extractYieldsItems: vi.fn(() => []),
	fetchAppMetadata: fetchAppMetadataMock,
	fetchDashboardConfig: fetchDashboardConfigMock,
	fetchDashboardConfigWithStatus: fetchDashboardConfigWithStatusMock,
	fetchProtocolsAndChains: fetchProtocolsAndChainsMock,
	fetchSingleChartData: vi.fn(),
	withTimeout: (promise: Promise<unknown>) => promise
}))

vi.mock('~/containers/ProDashboard/server/tableQueries', () => ({
	fetchTableServerData: vi.fn()
}))

vi.mock('~/containers/ProDashboard/services/ProtocolCharts', () => ({
	__esModule: true,
	default: {}
}))

vi.mock('~/containers/ProtocolOverview/api', () => ({
	fetchProtocolBySlug: vi.fn()
}))

vi.mock('~/containers/Stablecoins/api', () => ({
	fetchStablecoinAssetsApi: vi.fn(),
	fetchStablecoinChartApi: vi.fn(),
	fetchStablecoinPricesApi: vi.fn(),
	fetchStablecoinRatesApi: vi.fn()
}))

vi.mock('~/containers/Stablecoins/utils', () => ({
	formatPeggedAssetsData: vi.fn()
}))

vi.mock('~/containers/Unlocks/queries', () => ({
	getProtocolEmissionsPieData: vi.fn(),
	getProtocolEmissionsScheduleData: vi.fn()
}))

vi.mock('~/server/unifiedTable/protocols', () => ({
	fetchProtocolsTable: vi.fn()
}))

vi.mock('~/utils/http-client', () => ({
	fetchWithPoolingOnServer: vi.fn()
}))

import dashboardStreamHandler from '~/pages/api/dynamic/dashboard/[dashboardId]/stream'
import { getServerSideProps } from '~/pages/pro/[dashboardId]'

const PUBLIC_DASHBOARD_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'
const PRIVATE_DASHBOARD_CACHE_CONTROL = 'private, no-cache, no-store, must-revalidate'

function createSsrContext(dashboardId: string, authToken?: string): GetServerSidePropsContext {
	return {
		params: { dashboardId },
		query: {},
		req: { method: 'GET', cookies: authToken ? { pb_auth_token: authToken } : {} },
		res: { setHeader: vi.fn(), statusCode: 200 },
		resolvedUrl: `/pro/${dashboardId}`
	} as unknown as GetServerSidePropsContext
}

function createStreamRequest(dashboardId: string, authToken?: string): NextApiRequest {
	return {
		method: 'GET',
		query: { dashboardId },
		cookies: authToken ? { pb_auth_token: authToken } : {},
		url: `/api/dynamic/dashboard/${dashboardId}/stream`
	} as unknown as NextApiRequest
}

describe('pro dashboard cache headers', () => {
	const publicDashboard = {
		id: 'dashboard-1',
		user: 'user-1',
		visibility: 'public',
		collectionId: 'dashboards',
		collectionName: 'dashboards',
		aiGenerated: {
			'session-1': {
				mode: 'create',
				prompt: 'private prompt',
				rated: false,
				timestamp: '2026-01-02T00:00:00.000Z',
				userId: 'user-1'
			}
		},
		metrics: { internal: true },
		tags: ['fees', 'ethereum'],
		description: 'Public dashboard description',
		created: '2026-01-01T00:00:00.000Z',
		updated: '2026-01-02T00:00:00.000Z',
		editedAt: '2026-01-03T00:00:00.000Z',
		viewCount: 7,
		likeCount: 2,
		data: {
			dashboardName: 'Public Fees Dashboard',
			items: [
				{
					id: 'chart-1',
					kind: 'chart',
					chain: 'Ethereum',
					protocol: 'aave',
					type: 'fees'
				}
			]
		}
	}

	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '1200')
		fetchDashboardConfigMock.mockResolvedValue(publicDashboard)
		fetchDashboardConfigWithStatusMock.mockResolvedValue({ dashboard: publicDashboard, status: 200 })
		fetchProtocolsAndChainsMock.mockResolvedValue({ protocols: [], chains: [] })
		fetchAppMetadataMock.mockResolvedValue({})
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('keeps the public dashboard page cache header unjittered', async () => {
		const context = createSsrContext('dashboard-1')

		const result = await getServerSideProps(context)

		expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', PUBLIC_DASHBOARD_CACHE_CONTROL)
		expect(fetchDashboardConfigWithStatusMock).toHaveBeenCalledWith('dashboard-1', null)
		expect(result).toEqual({
			props: expect.objectContaining({
				dashboardId: 'dashboard-1',
				initialDashboard: expect.objectContaining({
					id: 'dashboard-1',
					visibility: 'public',
					tags: ['fees', 'ethereum'],
					data: { dashboardName: 'Public Fees Dashboard' },
					viewCount: 7,
					likeCount: 2
				}),
				noIndex: false,
				status: 200,
				seo: expect.objectContaining({
					title: 'Public Fees Dashboard - DefiLlama Pro Dashboard',
					description: 'Public dashboard description',
					canonicalPath: '/pro/dashboard-1'
				})
			})
		})
		expect((result as any).props.initialDashboard).not.toHaveProperty('user')
		expect((result as any).props.initialDashboard).not.toHaveProperty('collectionId')
		expect((result as any).props.initialDashboard).not.toHaveProperty('collectionName')
		expect((result as any).props.initialDashboard).not.toHaveProperty('aiGenerated')
		expect((result as any).props.initialDashboard).not.toHaveProperty('metrics')
	})

	it('redirects anonymous id requests to the canonical slug url', async () => {
		fetchDashboardConfigWithStatusMock.mockResolvedValue({
			dashboard: { ...publicDashboard, slug: 'public-fees-dashboard' },
			status: 200
		})
		const context = createSsrContext('dashboard-1')

		const result = await getServerSideProps(context)

		expect(result).toEqual({
			redirect: {
				destination: '/pro/public-fees-dashboard',
				permanent: true
			}
		})
	})

	it('redirects anonymous old-slug requests to the canonical slug url', async () => {
		fetchDashboardConfigWithStatusMock.mockResolvedValue({
			dashboard: { ...publicDashboard, slug: 'public-fees-dashboard' },
			status: 200
		})
		const context = createSsrContext('old-fees-dashboard')

		const result = await getServerSideProps(context)

		expect(result).toEqual({
			redirect: {
				destination: '/pro/public-fees-dashboard',
				permanent: true
			}
		})
	})

	it('renders canonical slug requests with a slug-based canonical path', async () => {
		fetchDashboardConfigWithStatusMock.mockResolvedValue({
			dashboard: { ...publicDashboard, slug: 'public-fees-dashboard' },
			status: 200
		})
		const context = createSsrContext('public-fees-dashboard')

		const result = await getServerSideProps(context)

		expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', PUBLIC_DASHBOARD_CACHE_CONTROL)
		expect(result).toEqual({
			props: expect.objectContaining({
				dashboardId: 'public-fees-dashboard',
				initialDashboard: expect.objectContaining({
					id: 'dashboard-1',
					slug: 'public-fees-dashboard'
				}),
				noIndex: false,
				seo: expect.objectContaining({
					canonicalPath: '/pro/public-fees-dashboard'
				})
			})
		})
	})

	it('uses private no-store cache headers for authenticated dashboard pages without fetching', async () => {
		const context = createSsrContext('dashboard-1', 'auth-token')

		await getServerSideProps(context)

		expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		expect(fetchDashboardConfigWithStatusMock).not.toHaveBeenCalled()
	})

	it('uses private no-store cache headers for unauthenticated private-dashboard pages', async () => {
		fetchDashboardConfigWithStatusMock.mockResolvedValue({ dashboard: null, status: 401 })
		const context = createSsrContext('private-dashboard')

		const result = await getServerSideProps(context)

		expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		expect(context.res.statusCode).toBe(401)
		expect(fetchDashboardConfigWithStatusMock).toHaveBeenCalledWith('private-dashboard', null)
		expect(result).toEqual({
			props: expect.objectContaining({
				dashboardId: 'private-dashboard',
				initialDashboard: null,
				noIndex: true,
				status: 401
			})
		})
	})

	it('uses 404 and noindex props for missing dashboard pages', async () => {
		fetchDashboardConfigWithStatusMock.mockResolvedValue({ dashboard: null, status: 404 })
		const context = createSsrContext('missing')

		const result = await getServerSideProps(context)

		expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		expect(context.res.statusCode).toBe(404)
		expect(result).toEqual({
			props: expect.objectContaining({
				dashboardId: 'missing',
				initialDashboard: null,
				noIndex: true,
				status: 404
			})
		})
	})

	it('keeps the public dashboard stream cache header unjittered', async () => {
		const res = createMockNextApiResponse()

		await dashboardStreamHandler(createStreamRequest('dashboard-1'), res)

		expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-ndjson')
		expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no')
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', PUBLIC_DASHBOARD_CACHE_CONTROL)
		expect(fetchDashboardConfigMock).toHaveBeenCalledWith('dashboard-1', null)
		expect(res.end).toHaveBeenCalled()
	})

	it('uses private no-store cache headers for authenticated dashboard streams', async () => {
		const res = createMockNextApiResponse()

		await dashboardStreamHandler(createStreamRequest('dashboard-1', 'auth-token'), res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		expect(fetchDashboardConfigMock).toHaveBeenCalledWith('dashboard-1', 'auth-token')
		expect(res.end).toHaveBeenCalled()
	})

	it('uses private no-store cache headers for unauthenticated private-dashboard streams', async () => {
		fetchDashboardConfigMock.mockResolvedValue({ visibility: 'private', data: { items: [] } })
		const res = createMockNextApiResponse()

		await dashboardStreamHandler(createStreamRequest('private-dashboard'), res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		expect(fetchDashboardConfigMock).toHaveBeenCalledWith('private-dashboard', null)
		expect(res.end).toHaveBeenCalled()
	})

	it('uses private no-store cache headers when dashboard is not found', async () => {
		fetchDashboardConfigMock.mockResolvedValue(null)
		const res = createMockNextApiResponse()

		await dashboardStreamHandler(createStreamRequest('missing'), res)

		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		expect(res.end).toHaveBeenCalled()
	})
})
