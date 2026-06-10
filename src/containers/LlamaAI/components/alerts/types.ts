export interface Alert {
	id: string
	title: string
	original_query: string
	schedule_expression: string
	next_run_at: string
	last_run_at: string | null
	last_run_status: 'success' | 'error' | null
	enabled: boolean
	run_count: number
	created_at: string
	delivery_channel?: DeliveryChannel
	condition?: string | null
	slack_team_id?: string | null
	slack_channel_id?: string | null
	slack_channel_name?: string | null
	test_sent?: boolean
}

export type DeliveryChannel = 'email' | 'telegram' | 'slack'

export interface AlertExecution {
	id: string
	executed_at: string
	status: string
	duration_ms: number
	chart_count: number
}

export interface AlertExecutionDetail extends AlertExecution {
	alertTitle: string
	generated_summary: string | null
	generated_charts: { id: string; type: string; title: string; url: string }[] | null
	citations: string[] | null
}

export interface AlertConfig {
	frequency: 'daily' | 'weekly'
	hour: number
	dayOfWeek: number
	timezone: string
}

export interface UpdateAlertInput {
	alertId: string
	title: string
	alertConfig: AlertConfig
	delivery_channel: DeliveryChannel
	condition: string
	slack_team_id?: string | null
	slack_channel_id?: string | null
	slack_channel_name?: string | null
}
