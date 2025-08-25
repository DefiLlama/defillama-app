import { Icon } from '~/components/Icon'
import type { ToolExecutionStatus as ToolExecutionStatusType } from './ChatPanel'

interface ToolExecutionStatusProps {
	status: ToolExecutionStatusType
}

export const ToolExecutionStatus = ({ status }: ToolExecutionStatusProps) => {
	const getToolIcon = (toolName?: string) => {
		switch (toolName) {
			case 'search_charts':
				return 'search'
			case 'get_chart_data':
				return 'bar-chart'
			default:
				return 'search'
		}
	}

	const getToolDescription = (toolName?: string) => {
		switch (toolName) {
			case 'search_charts':
				return 'Searching dashboard for relevant charts...'
			case 'get_chart_data':
				return 'Extracting chart images and data...'
			default:
				return 'Executing tool...'
		}
	}

	if (!status.isExecuting) return null

	return (
		<div className="flex items-center gap-3 rounded-lg border border-(--form-control-border) bg-(--bg-secondary) p-3 shadow-sm">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--primary)">
				<Icon name="sparkles" height={16} width={16} className="text-white" />
			</div>

			<div className="flex-1">
				<div className="mb-1 flex items-center gap-2">
					<Icon name={getToolIcon(status.toolName)} height={14} width={14} className="text-(--primary)" />
					<span className="text-sm font-medium text-(--text-primary)">{status.toolName || 'Tool'}</span>
				</div>

				<p className="text-xs text-(--text-secondary)">{status.description || getToolDescription(status.toolName)}</p>

				<div className="mt-2 flex items-center gap-2">
					<div className="flex gap-1">
						<div className="h-1 w-1 animate-bounce rounded-full bg-(--primary)" style={{ animationDelay: '0ms' }}></div>
						<div
							className="h-1 w-1 animate-bounce rounded-full bg-(--primary)"
							style={{ animationDelay: '150ms' }}
						></div>
						<div
							className="h-1 w-1 animate-bounce rounded-full bg-(--primary)"
							style={{ animationDelay: '300ms' }}
						></div>
					</div>
					<span className="text-xs text-(--text-secondary)">Processing...</span>
				</div>
			</div>
		</div>
	)
}
