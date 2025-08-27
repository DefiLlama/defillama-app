import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { AIGeneratedData } from '../ProDashboardAPIContext'

interface AIGenerationHistoryProps {
	aiGenerated: AIGeneratedData
}

export function AIGenerationHistory({ aiGenerated }: AIGenerationHistoryProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	const sessions = Object.entries(aiGenerated)
		.map(([sessionId, data]) => ({
			sessionId,
			...data
		}))
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

	if (sessions.length === 0) return null

	return (
		<div className="mb-4">
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="pro-text2 hover:pro-text1 flex items-center gap-2 text-sm transition-colors"
			>
				<Icon name="sparkles" height={16} width={16} className="text-(--primary)" />
				<span>View AI Generation History</span>
				<Icon
					name="chevron-down"
					height={14}
					width={14}
					className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
				/>
			</button>

			{isExpanded && (
				<div className="mt-3 space-y-3">
					{sessions.map((session, index) => (
						<div key={session.sessionId} className="pro-bg1 pro-border border p-3">
							<div className="mb-2 flex items-center gap-2">
								<Icon name="sparkles" height={14} width={14} className="text-(--primary)" />
								<span className="pro-text1 text-sm font-medium">
									{session.mode === 'create' ? 'Initial Generation' : 'Iteration'} #{sessions.length - index}
								</span>
								<span className="pro-text3 text-xs">{new Date(session.timestamp).toLocaleDateString()}</span>
								{session.rating !== undefined && session.rating !== -1 && (
									<div className="flex items-center gap-1">
										{session.rating === -99 ? (
											<>
												<Icon name="arrow-left" height={12} width={12} className="text-orange-500" />
												<span className="text-xs text-orange-500">Undone</span>
											</>
										) : (
											<>
												<Icon name="star" height={12} width={12} className="fill-current text-yellow-400" />
												<span className="pro-text2 text-xs">{session.rating}/5</span>
											</>
										)}
									</div>
								)}
							</div>

							<div className="pro-text2 text-sm">
								<span className="font-medium">Prompt: </span>
								<span className="pro-text3">{session.prompt || 'No prompt recorded'}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
