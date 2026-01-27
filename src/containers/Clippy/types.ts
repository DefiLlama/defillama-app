export interface ClippyPageContext {
	route: string
	pageType: string
	entity?: {
		type: 'protocol' | 'chain' | 'token' | 'stablecoin'
		slug: string
		name?: string
		tokenSymbol?: string
		geckoId?: string
		chains?: string[]
		category?: string
		description?: string
	}
	filters?: Record<string, any>
	highlightTargets?: string[]
	availableTabs?: string[]
	pageValues?: Record<string, Record<string, string>>
	chartMetrics?: {
		available: string[]
		active: string[]
	}
}

export interface ClippyMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: Date
	actions?: ClippyAction[]
	routeToLlamaAI?: { reason: string; prefilledQuery: string }
}

export interface ClippyAction {
	type: 'toggle' | 'filter' | 'highlight' | 'navigate'
	target: string
	params?: any
}

export interface ClippyResponse {
	success: boolean
	sessionId: string
	message: string
	actions?: ClippyAction[]
	routeToLlamaAI?: { reason: string; prefilledQuery: string }
	metadata?: {
		iterations: number
		toolsCalled: string[]
		durationMs: number
		totalDurationMs: number
	}
}
