import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ITokenRightsData } from './api.types'
import { TokenRightsByProtocol } from './TokenRightsByProtocol'

vi.mock('~/components/Copy', () => ({
	CopyHelper: () => null
}))

vi.mock('~/components/Icon', () => ({
	Icon: () => null
}))

vi.mock('~/components/TokenLogo', () => ({
	TokenLogo: () => null
}))

vi.mock('~/components/Tooltip', () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

vi.mock('~/containers/Raises/utils', () => ({
	formatRaiseAmount: () => null
}))

vi.mock('~/utils', () => ({
	formattedNum: (value: number) => String(value)
}))

const baseTokenRightsData: ITokenRightsData = {
	overview: {
		protocolName: 'Test Protocol',
		tokens: ['TEST'],
		tokenTypes: ['Governance'],
		description: 'Protocol description',
		utility: null,
		lastUpdated: null
	},
	governance: {
		summary: 'Governance summary',
		decisionTokens: ['TEST'],
		details: null,
		links: []
	},
	decisions: {
		treasury: { tokens: ['TEST'], details: null },
		revenue: { tokens: ['TEST'], details: null }
	},
	economic: {
		summary: null,
		feeSwitchStatus: 'OFF',
		feeSwitchDetails: null,
		links: []
	},
	valueAccrual: {
		primary: 'Buybacks',
		details: 'Value accrues via buybacks.',
		buybacks: { tokens: ['TEST'], details: null },
		dividends: { tokens: ['N/A'], details: null },
		burns: { status: 'N/A', details: null }
	},
	alignment: {
		fundraising: [],
		raiseDetails: null,
		associatedEntities: [],
		equityRevenueCapture: null,
		equityStatement: null,
		ipAndBrand: null,
		domain: null,
		links: []
	},
	resources: {
		addresses: [],
		reports: []
	}
}

describe('TokenRightsByProtocol', () => {
	it('hides the primary value accrual card when the primary value is N/A', () => {
		const html = renderToStaticMarkup(
			<TokenRightsByProtocol
				name="Test Protocol"
				symbol="TEST"
				raises={null}
				tokenRightsData={{
					...baseTokenRightsData,
					valueAccrual: {
						...baseTokenRightsData.valueAccrual,
						primary: 'N/A',
						details: 'No primary accrual mechanism.'
					}
				}}
			/>
		)

		expect(html).not.toContain('Primary Value Accrual')
		expect(html).not.toContain('No primary accrual mechanism.')
	})

	it('still shows the primary value accrual card when details exist and the primary value is null', () => {
		const html = renderToStaticMarkup(
			<TokenRightsByProtocol
				name="Test Protocol"
				symbol="TEST"
				raises={null}
				tokenRightsData={{
					...baseTokenRightsData,
					valueAccrual: {
						...baseTokenRightsData.valueAccrual,
						primary: null
					}
				}}
			/>
		)

		expect(html).toContain('Primary Value Accrual')
		expect(html).toContain('Value accrues via buybacks.')
	})

	it('uses an h2 for the embedded token page header variant', () => {
		const html = renderToStaticMarkup(
			<TokenRightsByProtocol
				name="Test Protocol"
				symbol="TEST"
				raises={null}
				tokenRightsData={baseTokenRightsData}
				headerVariant="embedded"
			/>
		)

		expect(html).toContain('<h2')
		expect(html).toContain('Token Rights and Value Accrual')
		expect(html).not.toContain('<h1')
	})
})
