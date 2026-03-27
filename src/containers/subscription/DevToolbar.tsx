// [DEV-TOOLBAR] This entire file should be deleted before production
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { BillingCycle, PlanKey } from './types'

export type SubPageScenario =
	| 'live'
	| 'visitor'
	| 'free'
	| 'trial'
	| 'pro-monthly'
	| 'pro-yearly'
	| 'api-monthly'
	| 'api-yearly'

const SCENARIO_LABELS: Record<SubPageScenario, string> = {
	live: 'Live',
	visitor: 'Visitor',
	free: 'Free',
	trial: 'Trial',
	'pro-monthly': 'Pro Monthly',
	'pro-yearly': 'Pro Yearly',
	'api-monthly': 'API Monthly',
	'api-yearly': 'API Yearly'
}

export interface SubPageState {
	isAuthenticated: boolean
	currentPlan: PlanKey | null
	isTrial: boolean
	userBillingCycle: BillingCycle | null
	isLoading?: boolean
}

function buildState(scenario: SubPageScenario): SubPageState | null {
	switch (scenario) {
		case 'live':
			return null
		case 'visitor':
			return { isAuthenticated: false, currentPlan: null, isTrial: false, userBillingCycle: null }
		case 'free':
			return { isAuthenticated: true, currentPlan: 'free', isTrial: false, userBillingCycle: null }
		case 'trial':
			return { isAuthenticated: true, currentPlan: 'pro', isTrial: true, userBillingCycle: 'monthly' }
		case 'pro-monthly':
			return { isAuthenticated: true, currentPlan: 'pro', isTrial: false, userBillingCycle: 'monthly' }
		case 'pro-yearly':
			return { isAuthenticated: true, currentPlan: 'pro', isTrial: false, userBillingCycle: 'yearly' }
		case 'api-monthly':
			return { isAuthenticated: true, currentPlan: 'api', isTrial: false, userBillingCycle: 'monthly' }
		case 'api-yearly':
			return { isAuthenticated: true, currentPlan: 'api', isTrial: false, userBillingCycle: 'yearly' }
	}
}

const SubPageDevContext = createContext<SubPageState | null>(null)

export function useSubPageDev() {
	return useContext(SubPageDevContext)
}

function ToolbarUI({ scenario, onChange }: { scenario: SubPageScenario; onChange: (s: SubPageScenario) => void }) {
	return (
		<div className="sticky top-0 z-50 flex flex-wrap items-center gap-1.5 border-b border-yellow-500/30 bg-yellow-950/80 px-3 py-2 backdrop-blur-sm">
			<span className="mr-1 text-xs font-medium text-yellow-400">DEV</span>
			{Object.entries(SCENARIO_LABELS).map(([key, label]) => (
				<button
					key={key}
					onClick={() => onChange(key as SubPageScenario)}
					className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
						scenario === key
							? 'bg-yellow-500 text-yellow-950'
							: 'bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'
					}`}
				>
					{label}
				</button>
			))}
		</div>
	)
}

export function SubPageDevToolbar({ children }: { children: ReactNode }) {
	const [scenario, setScenario] = useState<SubPageScenario>('live')
	const overrides = buildState(scenario)

	return (
		<SubPageDevContext.Provider value={overrides}>
			<ToolbarUI scenario={scenario} onChange={setScenario} />
			{children}
		</SubPageDevContext.Provider>
	)
}
