import type { GetServerSidePropsContext, NextApiRequest } from 'next'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const { fetchDashboardConfigMock, fetchProtocolsAndChainsMock, fetchAppMetadataMock } = vi.hoisted(() => ({
	fetchDashboardConfigMock: vi.fn(),
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

import dashboardStreamHandler from '~/pages/api/dashboard/[dashboardId]/stream'
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
		url: `/api/dashboard/${dashboardId}/stream`
	} as unknown as NextApiRequest
}

describe('pro dashboard cache headers', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('NEXT_STATIC_REVALIDATE_JITTER_SECONDS', '1200')
		fetchDashboardConfigMock.mockResolvedValue({ data: { items: [] } })
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
		expect(fetchDashboardConfigMock).toHaveBeenCalledWith('dashboard-1', null)
		expect(result).toEqual({ props: { dashboardId: 'dashboard-1' } })
	})

	it('uses private no-store cache headers for authenticated dashboard pages', async () => {
		const context = createSsrContext('dashboard-1', 'auth-token')

		await getServerSideProps(context)

		expect(context.res.setHeader).toHaveBeenCalledWith('Cache-Control', PRIVATE_DASHBOARD_CACHE_CONTROL)
		expect(fetchDashboardConfigMock).toHaveBeenCalledWith('dashboard-1', 'auth-token')
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
})
