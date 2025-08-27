import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { DashboardItemConfig } from '../types'

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
		aiGenerationContext?: {
			sessionId: string
			mode: 'create' | 'iterate'
			timestamp: string
			prompt: string
		}
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
	const [errors, setErrors] = useState<{
		dashboardName?: string
		aiDescription?: string
	}>({})
	const [touchedFields, setTouchedFields] = useState<{
		dashboardName?: boolean
		aiDescription?: boolean
	}>({})

	if (!isOpen) return null

	const validateDashboardName = (value: string): string | undefined => {
		if (mode === 'create' && !value.trim()) {
			return 'Dashboard name is required'
		}
		return undefined
	}

	const validateAiDescription = (value: string): string | undefined => {
		if (!value.trim()) {
			return 'Description is required'
		}
		if (value.trim().length < 20) {
			return 'Description must be at least 20 characters'
		}
		if (value.length > 5000) {
			return 'Description must be 5000 characters or less'
		}
		return undefined
	}

	const validateForm = (): boolean => {
		const newErrors: typeof errors = {}

		const dashboardNameError = validateDashboardName(dashboardName)
		const aiDescriptionError = validateAiDescription(aiDescription)

		if (dashboardNameError) newErrors.dashboardName = dashboardNameError
		if (aiDescriptionError) newErrors.aiDescription = aiDescriptionError

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleFieldBlur = (field: keyof typeof touchedFields) => {
		setTouchedFields((prev) => ({ ...prev, [field]: true }))

		const newErrors = { ...errors }
		if (field === 'dashboardName') {
			const error = validateDashboardName(dashboardName)
			if (error) newErrors.dashboardName = error
			else delete newErrors.dashboardName
		}
		if (field === 'aiDescription') {
			const error = validateAiDescription(aiDescription)
			if (error) newErrors.aiDescription = error
			else delete newErrors.aiDescription
		}
		setErrors(newErrors)
	}

	const handleGenerate = async () => {
		if (!isAuthenticated || !user?.id) {
			toast.error('Please sign in to generate dashboards')
			return
		}

		if (!validateForm()) {
			setTouchedFields({ dashboardName: true, aiDescription: true })
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
			const sessionId = data.metadata?.sessionId
			const generationMode = data.metadata?.mode || mode

			onGenerate({
				dashboardName: mode === 'iterate' ? existingDashboard?.dashboardName || '' : dashboardName.trim(),
				visibility: mode === 'iterate' ? existingDashboard?.visibility || 'private' : visibility,
				tags: mode === 'iterate' ? existingDashboard?.tags || [] : tags,
				description: mode === 'iterate' ? existingDashboard?.description || '' : '',
				items,
				aiGenerationContext: sessionId
					? {
							sessionId,
							mode: generationMode,
							timestamp: new Date().toISOString(),
							prompt: aiDescription.trim()
						}
					: undefined
			})

			setDashboardName('')
			setAiDescription('')
			setVisibility('public')
			setTags([])
			setTagInput('')
			setErrors({})
			setTouchedFields({})
			onClose()
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
			setErrors({})
			setTouchedFields({})
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
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs dark:bg-black/70"
			onClick={handleClose}
		>
			<div className="pro-bg1 pro-border w-full max-w-lg border shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="p-6">
					<div className="mb-6 flex items-center justify-between">
						<h2 className="pro-text1 text-xl font-semibold">
							{mode === 'iterate' ? 'Edit with LlamaAI' : 'Generate using LlamaAI'}
						</h2>
						<button onClick={handleClose} className="pro-hover-bg p-1 transition-colors">
							<Icon name="x" height={20} width={20} className="pro-text2" />
						</button>
					</div>

					<div className="space-y-6">
						{mode === 'create' && (
							<div>
								<label className="pro-text1 mb-3 block text-sm font-medium">Dashboard Name</label>
								<input
									type="text"
									value={dashboardName}
									onChange={(e) => {
										setDashboardName(e.target.value)
										if (touchedFields.dashboardName) {
											handleFieldBlur('dashboardName')
										}
									}}
									onBlur={() => handleFieldBlur('dashboardName')}
									placeholder="e.g., Ethereum vs Arbitrum Analysis"
									className={`bg-opacity-50 pro-text1 placeholder:pro-text3 w-full border bg-(--bg-glass) px-3 py-2 focus:outline-hidden ${
										touchedFields.dashboardName && errors.dashboardName
											? 'border-red-500 focus:border-red-500'
											: 'pro-border focus:border-(--primary)'
									} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
									disabled={isLoading}
									autoFocus
								/>
								{touchedFields.dashboardName && errors.dashboardName && (
									<p className="mt-1 text-sm text-red-500">{errors.dashboardName}</p>
								)}
							</div>
						)}

						<div>
							<label className="pro-text1 mb-3 block text-sm font-medium">
								{mode === 'iterate'
									? 'Describe what you want to add or change'
									: 'Describe the dashboard you want to create'}
							</label>
							<textarea
								value={aiDescription}
								onChange={(e) => {
									setAiDescription(e.target.value)
									if (touchedFields.aiDescription) {
										handleFieldBlur('aiDescription')
									}
								}}
								onBlur={() => handleFieldBlur('aiDescription')}
								placeholder={
									mode === 'iterate'
										? 'e.g., Add a chart showing weekly DEX volume breakdown by top 5 protocols, or Remove the stablecoin chart and add TVL comparison...'
										: 'e.g., Build a DeFi yields dashboard with top earning protocols, comparing different chains and showing historical performance...'
								}
								rows={4}
								className={`bg-opacity-50 pro-text1 placeholder:pro-text3 w-full resize-none border bg-(--bg-glass) px-3 py-2 focus:outline-hidden ${
									touchedFields.aiDescription && errors.aiDescription
										? 'border-red-500 focus:border-red-500'
										: 'pro-border focus:border-(--primary)'
								} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
								disabled={isLoading}
								autoFocus={mode === 'iterate'}
							/>
							{touchedFields.aiDescription && errors.aiDescription && (
								<p className="mt-1 text-sm text-red-500">{errors.aiDescription}</p>
							)}
							<p className="pro-text3 mt-1 text-xs">
								{mode === 'iterate'
									? 'Be specific about what you want to add, remove, or modify'
									: 'Be specific about what data, charts, and insights you want to see'}{' '}
								({aiDescription.length}/5000)
							</p>
						</div>

						{mode === 'create' && (
							<div>
								<label className="pro-text1 mb-3 block text-sm font-medium">Visibility</label>
								<div className="flex gap-3">
									<button
										onClick={() => setVisibility('public')}
										disabled={isLoading}
										className={`flex-1 border px-4 py-3 transition-colors ${
											visibility === 'public'
												? 'bg-opacity-20 pro-text1 border-(--primary) bg-(--primary)'
												: 'pro-border pro-text3 hover:pro-text1'
										} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
									>
										<Icon name="earth" height={16} width={16} className="mr-2 inline" />
										Public
									</button>
									<button
										onClick={() => setVisibility('private')}
										disabled={isLoading}
										className={`flex-1 border px-4 py-3 transition-colors ${
											visibility === 'private'
												? 'bg-opacity-20 pro-text1 border-(--primary) bg-(--primary)'
												: 'pro-border pro-text3 hover:pro-text1'
										} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
									>
										<Icon name="key" height={16} width={16} className="mr-2 inline" />
										Private
									</button>
								</div>
								{visibility === 'public' && (
									<p className="pro-text3 mt-2 text-sm">Public dashboards are visible in the Discover tab</p>
								)}
							</div>
						)}

						{mode === 'create' && (
							<div>
								<label className="pro-text1 mb-3 block text-sm font-medium">Tags</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyDown={handleTagInputKeyDown}
										placeholder="Enter tag name"
										className={`bg-opacity-50 pro-border pro-text1 placeholder:pro-text3 flex-1 border bg-(--bg-glass) px-3 py-2 focus:border-(--primary) focus:outline-hidden ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
										disabled={isLoading}
									/>
									<button
										onClick={() => handleAddTag(tagInput)}
										className={`border px-4 py-2 transition-colors ${
											tagInput.trim() && !isLoading
												? 'border-(--primary) text-(--primary) hover:bg-(--primary) hover:text-white'
												: 'pro-border pro-text3'
										} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
									>
										Add Tag
									</button>
								</div>

								<p className="pro-text3 mt-2 text-xs">Press Enter to add tag</p>

								{tags.length > 0 && (
									<div className="mt-3 flex flex-wrap gap-2">
										{tags.map((tag) => (
											<span
												key={tag}
												className="bg-opacity-50 pro-text2 pro-border flex items-center gap-1 border bg-(--bg-glass) px-3 py-1 text-sm"
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

					<div className="mt-8 flex gap-3">
						<button
							onClick={handleClose}
							disabled={isLoading}
							className="pro-border pro-text1 flex-1 border px-4 py-2 transition-colors hover:bg-(--bg-main) disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							onClick={handleGenerate}
							disabled={isLoading}
							className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 transition-colors ${
								!isLoading
									? 'animate-ai-glow bg-(--primary) text-white hover:bg-(--primary-hover)'
									: 'pro-text3 cursor-not-allowed bg-(--bg-tertiary)'
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
