import { useState } from 'react'
import { Icon } from '~/components/Icon'
import toast from 'react-hot-toast'
import { DashboardItemConfig } from '../types'
import { useAuthContext } from '~/containers/Subscribtion/auth'

const MCP_SERVER = 'https://mcp.llama.fi'

interface GenerateDashboardModalProps {
	isOpen: boolean
	onClose: () => void
	mode?: 'create' | 'iterate'
	existingDashboard?: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items: DashboardItemConfig[]
	}
	onGenerate: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items: DashboardItemConfig[]
	}) => void
}

export function GenerateDashboardModal({
	isOpen,
	onClose,
	mode = 'create',
	existingDashboard,
	onGenerate
}: GenerateDashboardModalProps) {
	const { user, isAuthenticated, authorizedFetch } = useAuthContext()
	const [dashboardName, setDashboardName] = useState('')
	const [aiDescription, setAiDescription] = useState('')
	const [visibility, setVisibility] = useState<'private' | 'public'>('public')
	const [tags, setTags] = useState<string[]>([])
	const [tagInput, setTagInput] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	if (!isOpen) return null

	const handleGenerate = async () => {
		if (!isAuthenticated || !user?.id) {
			toast.error('Please sign in to generate dashboards')
			return
		}

		if (!aiDescription.trim()) {
			toast.error('Please describe what you want to add or change')
			return
		}

		if (mode === 'create' && !dashboardName.trim()) {
			toast.error('Please provide both dashboard name and AI description')
			return
		}

		setIsLoading(true)

		try {
			const requestBody =
				mode === 'iterate'
					? {
							message: aiDescription.trim(),
							mode: 'iterate',
							existingDashboard: {
								dashboardName: existingDashboard?.dashboardName || '',
								items: existingDashboard?.items || []
							}
					  }
					: {
							message: aiDescription.trim(),
							dashboardName: dashboardName.trim()
					  }

			const response = await authorizedFetch(`${MCP_SERVER}/dashboard-creator`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			})

			if (!response) {
				throw new Error('Authentication failed')
			}

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = await response.json()

			if (!data.dashboardConfig || !Array.isArray(data.dashboardConfig.items)) {
				throw new Error('Invalid response format from AI service')
			}

			const items = data.dashboardConfig.items as DashboardItemConfig[]

			onGenerate({
				dashboardName: mode === 'iterate' ? existingDashboard?.dashboardName || '' : dashboardName.trim(),
				visibility: mode === 'iterate' ? existingDashboard?.visibility || 'private' : visibility,
				tags: mode === 'iterate' ? existingDashboard?.tags || [] : tags,
				description: mode === 'iterate' ? existingDashboard?.description || '' : '',
				items
			})

			setDashboardName('')
			setAiDescription('')
			setVisibility('public')
			setTags([])
			setTagInput('')
			onClose()

			toast.success(mode === 'iterate' ? 'Dashboard updated successfully!' : 'Dashboard generated successfully!')
		} catch (error) {
			console.error('Failed to generate dashboard:', error)
			toast.error('Failed to generate dashboard. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleClose = () => {
		if (!isLoading) {
			setDashboardName('')
			setAiDescription('')
			setVisibility('public')
			setTags([])
			setTagInput('')
			onClose()
		}
	}

	const handleAddTag = (tag: string) => {
		const trimmedTag = tag.trim().toLowerCase()
		if (trimmedTag && !tags.includes(trimmedTag)) {
			setTags([...tags, trimmedTag])
		}
		setTagInput('')
	}

	const handleRemoveTag = (tag: string) => {
		setTags(tags.filter((t) => t !== tag))
	}

	const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && tagInput.trim()) {
			e.preventDefault()
			handleAddTag(tagInput)
		}
	}

	return (
		<div
			className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
			onClick={handleClose}
		>
			<div className="pro-bg1 shadow-2xl w-full max-w-lg border pro-border" onClick={(e) => e.stopPropagation()}>
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-semibold pro-text1">
							{mode === 'iterate' ? 'Edit with LlamaAI' : 'Generate using LlamaAI'}
						</h2>
						<button onClick={handleClose} className="p-1 pro-hover-bg transition-colors" disabled={isLoading}>
							<Icon name="x" height={20} width={20} className="pro-text2" />
						</button>
					</div>

					<div className="space-y-6">
						{mode === 'create' && (
							<div>
								<label className="block text-sm font-medium pro-text1 mb-3">Dashboard Name</label>
								<input
									type="text"
									value={dashboardName}
									onChange={(e) => setDashboardName(e.target.value)}
									placeholder="e.g., Ethereum vs Arbitrum Analysis"
									className="w-full px-3 py-2 bg-(--bg-glass) bg-opacity-50 border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary)"
									disabled={isLoading}
									autoFocus
								/>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium pro-text1 mb-3">
								{mode === 'iterate'
									? 'Describe what you want to add or change'
									: 'Describe the dashboard you want to create'}
							</label>
							<textarea
								value={aiDescription}
								onChange={(e) => setAiDescription(e.target.value)}
								placeholder={
									mode === 'iterate'
										? 'e.g., Add a chart showing weekly DEX volume breakdown by top 5 protocols, or Remove the stablecoin chart and add TVL comparison...'
										: 'e.g., Build a DeFi yields dashboard with top earning protocols, comparing different chains and showing historical performance...'
								}
								rows={4}
								className="w-full px-3 py-2 bg-(--bg-glass) bg-opacity-50 border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary) resize-none"
								disabled={isLoading}
								autoFocus={mode === 'iterate'}
							/>
							<p className="mt-1 text-xs pro-text3">
								{mode === 'iterate'
									? 'Be specific about what you want to add, remove, or modify'
									: 'Be specific about what data, charts, and insights you want to see'}
							</p>
						</div>

						{mode === 'create' && (
							<div>
								<label className="block text-sm font-medium pro-text1 mb-3">Visibility</label>
								<div className="flex gap-3">
									<button
										onClick={() => setVisibility('public')}
										disabled={isLoading}
										className={`flex-1 px-4 py-3 border transition-colors ${
											visibility === 'public'
												? 'border-(--primary) bg-(--primary) bg-opacity-20 pro-text1'
												: 'pro-border pro-text3 hover:pro-text1'
										} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
									>
										<Icon name="earth" height={16} width={16} className="inline mr-2" />
										Public
									</button>
									<button
										onClick={() => setVisibility('private')}
										disabled={isLoading}
										className={`flex-1 px-4 py-3 border transition-colors ${
											visibility === 'private'
												? 'border-(--primary) bg-(--primary) bg-opacity-20 pro-text1'
												: 'pro-border pro-text3 hover:pro-text1'
										} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
									>
										<Icon name="key" height={16} width={16} className="inline mr-2" />
										Private
									</button>
								</div>
								{visibility === 'public' && (
									<p className="mt-2 text-sm pro-text3">Public dashboards are visible in the Discover tab</p>
								)}
							</div>
						)}

						{mode === 'create' && (
							<div>
								<label className="block text-sm font-medium pro-text1 mb-3">Tags</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyDown={handleTagInputKeyDown}
										placeholder="Enter tag name"
										className="flex-1 px-3 py-2 bg-(--bg-glass) bg-opacity-50 border pro-border pro-text1 placeholder:pro-text3 focus:outline-hidden focus:border-(--primary)"
										disabled={isLoading}
									/>
									<button
										onClick={() => handleAddTag(tagInput)}
										disabled={!tagInput.trim() || isLoading}
										className={`px-4 py-2 border transition-colors ${
											tagInput.trim() && !isLoading
												? 'border-(--primary) text-(--primary) hover:bg-(--primary) hover:text-white'
												: 'pro-border pro-text3 cursor-not-allowed'
										}`}
									>
										Add Tag
									</button>
								</div>

								<p className="mt-2 text-xs pro-text3">Press Enter to add tag</p>

								{tags.length > 0 && (
									<div className="flex flex-wrap gap-2 mt-3">
										{tags.map((tag) => (
											<span
												key={tag}
												className="px-3 py-1 bg-(--bg-glass) bg-opacity-50 text-sm pro-text2 border pro-border flex items-center gap-1"
											>
												{tag}
												<button
													onClick={() => handleRemoveTag(tag)}
													className="hover:text-(--primary)"
													disabled={isLoading}
												>
													<Icon name="x" height={12} width={12} />
												</button>
											</span>
										))}
									</div>
								)}
							</div>
						)}
					</div>

					<div className="flex gap-3 mt-8">
						<button
							onClick={handleClose}
							disabled={isLoading}
							className="flex-1 px-4 py-2 border pro-border pro-text1 hover:bg-(--bg-main) transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							onClick={handleGenerate}
							disabled={!aiDescription.trim() || (mode === 'create' && !dashboardName.trim()) || isLoading}
							className={`flex-1 px-4 py-2 transition-colors flex items-center justify-center gap-2 ${
								aiDescription.trim() && (mode === 'iterate' || dashboardName.trim()) && !isLoading
									? 'bg-(--primary) text-white hover:bg-(--primary-hover) animate-ai-glow'
									: 'bg-(--bg-tertiary) pro-text3 cursor-not-allowed'
							}`}
						>
							{isLoading ? (
								<>
									<Icon name="sparkles" height={16} width={16} className="animate-spin" />
									{mode === 'iterate' ? 'Updating...' : 'Generating...'}
								</>
							) : (
								<>
									<Icon name="sparkles" height={16} width={16} />
									{mode === 'iterate' ? 'Edit Dashboard' : 'Generate Dashboard'}
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}