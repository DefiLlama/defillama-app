import { Icon } from '~/components/Icon'
import { AIGeneratedData } from '../ProDashboardAPIContext'

interface AIGenerationHistoryProps {
	aiGenerated: AIGeneratedData
}

export function AIGenerationHistory({ aiGenerated }: AIGenerationHistoryProps) {
	const sessions = Object.entries(aiGenerated)
		.map(([sessionId, data]) => ({
			sessionId,
			...data
		}))
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

	if (sessions.length === 0) return null

	return (
		<details className="group flex flex-col">
			<summary className="pro-link flex items-center gap-2">
				<Icon name="sparkles" height={16} width={16} />
				<span>View AI Generation History</span>
				<Icon name="chevron-down" height={14} width={14} className="transition-transform group-open:rotate-180" />
			</summary>
			<>
				{sessions.map((session, index) => (
					<div
						key={session.sessionId}
						className="mt-2 flex flex-nowrap gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 pl-1 md:p-4 md:pl-2"
					>
						<Icon
							name="sparkles"
							height={14}
							width={14}
							className="text-pro-blue-400 dark:text-pro-blue-200 shrink-0"
						/>
						<div className="flex flex-col gap-1">
							<div className="-mt-0.5 flex flex-wrap items-center gap-2 text-xs">
								<h1 className="text-sm font-medium">
									{session.mode === 'create' ? 'Initial Generation' : 'Iteration'} #{sessions.length - index}
								</h1>
								<p className="text-(--text-form)">{new Date(session.timestamp).toLocaleDateString()}</p>
								{session.rating !== undefined && session.rating !== -1 && (
									<p className="flex items-center gap-1">
										<span className="sr-only">Rating: </span>
										{session.rating === -99 ? (
											<>
												<Icon name="arrow-left" height={12} width={12} className="text-orange-500" />
												<span className="text-orange-500">Undone</span>
											</>
										) : (
											<>
												<Icon name="star" height={12} width={12} className="fill-current text-yellow-400" />
												<span>{session.rating}/5</span>
											</>
										)}
									</p>
								)}
							</div>
							<p>
								<span className="font-medium">Prompt: </span>
								<span className="text-(--text-label)">{session.prompt || 'No prompt recorded'}</span>
							</p>
						</div>
					</div>
				))}
			</>
		</details>
	)
}
