import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { DynamicUnlocksCharts } = vi.hoisted(() => ({
	DynamicUnlocksCharts: ({ protocolName, hideTokenStats }: { protocolName: string; hideTokenStats?: boolean }) => (
		<div>{`unlocks-charts:${protocolName}:${String(hideTokenStats)}`}</div>
	)
}))

var authState = {
	authorizedFetch: vi.fn(),
	hasActiveSubscription: true,
	isAuthenticated: true,
	loaders: { userLoading: false }
}

var queryState: {
	data?: any
	error?: Error | null
	isLoading: boolean
} = {
	data: null,
	error: null,
	isLoading: false
}
vi.mock('next/router', () => ({
	useRouter: () => ({ asPath: '/token/sol' })
}))

vi.mock('@ariakit/react', () => ({
	useDialogStore: () => ({ show: vi.fn() })
}))

vi.mock('~/components/Icon', () => ({
	Icon: () => <span>icon</span>
}))

vi.mock('next/dynamic', () => ({
	default: (_loader: () => Promise<unknown>, options?: { loading?: (props: any) => React.ReactNode }) => {
		return (props: any) => {
			if ('protocolName' in (props ?? {})) {
				return <DynamicUnlocksCharts {...props} />
			}

			return options?.loading?.(props) ?? null
		}
	}
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: () => queryState
}))

vi.mock('~/components/Link', () => ({
	BasicLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
		<a href={href} className={className}>
			{children}
		</a>
	)
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => <div>loader</div>
}))

vi.mock('~/containers/Subscription/SignInModal', () => ({
	SignInModal: () => <div>sign-in-modal</div>
}))

vi.mock('~/containers/Subscription/auth', () => ({
	useAuthContext: () => authState
}))

import { TokenUnlocksSection } from '../TokenUnlocksSection'

describe('TokenUnlocksSection', () => {
	afterEach(() => {
		authState = {
			authorizedFetch: vi.fn(),
			hasActiveSubscription: true,
			isAuthenticated: true,
			loaders: { userLoading: false }
		}
		queryState = {
			data: null,
			error: null,
			isLoading: false
		}
		vi.clearAllMocks()
	})

	it('renders nothing when the token page has no resolved unlock slug', () => {
		expect(renderToStaticMarkup(<TokenUnlocksSection resolvedUnlocksSlug={null} />)).toBe('')
	})

	it('shows a loader while auth or unlocks data is loading', () => {
		queryState = {
			data: null,
			error: null,
			isLoading: true
		}

		const html = renderToStaticMarkup(<TokenUnlocksSection resolvedUnlocksSlug="solana" />)

		expect(html).toContain('loader')
		expect(html).toContain('Unlocks')
		expect(html).toContain('min-h-[80dvh]')
	})

	it('shows a sign-in gate for unauthenticated users', () => {
		authState = {
			authorizedFetch: vi.fn(),
			hasActiveSubscription: false,
			isAuthenticated: false,
			loaders: { userLoading: false }
		}

		const html = renderToStaticMarkup(<TokenUnlocksSection resolvedUnlocksSlug="solana" />)

		expect(html).toContain('active subscription')
		expect(html).toContain('sign-in-modal')
		expect(html).toContain('Unlocks')
		expect(html).toContain('min-h-[80dvh]')
	})

	it('shows a subscription link for authenticated users without a subscription', () => {
		authState = {
			authorizedFetch: vi.fn(),
			hasActiveSubscription: false,
			isAuthenticated: true,
			loaders: { userLoading: false }
		}

		const html = renderToStaticMarkup(<TokenUnlocksSection resolvedUnlocksSlug="solana" />)

		expect(html).toContain('/subscription?returnUrl=%2Ftoken%2Fsol')
		expect(html).toContain('active subscription')
		expect(html).toContain('Unlocks')
	})

	it('shows the query error message when the unlock fetch fails', () => {
		queryState = {
			data: null,
			error: new Error('Failed to fetch token unlocks'),
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenUnlocksSection resolvedUnlocksSlug="solana" />)

		expect(html).toContain('Failed to fetch token unlocks')
		expect(html).toContain('Unlocks')
		expect(html).toContain('min-h-[80dvh]')
	})

	it('renders the shared unlock charts for subscribers when data is available', () => {
		queryState = {
			data: { categories: { documented: ['Team'], realtime: [] }, events: [] },
			error: null,
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenUnlocksSection resolvedUnlocksSlug="solana" />)

		expect(html).toContain('Unlocks')
		expect(html).toContain('unlocks-charts:solana:true')
	})
})
