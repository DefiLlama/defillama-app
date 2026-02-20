import * as Ariakit from '@ariakit/react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import type { DashboardItemConfig } from '../types'
import { sanitizeItemsForAPI } from '../utils/dashboardUtils'

const MCP_SERVER = 'https://mcp.llama.fi'
const EMPTY_DASHBOARD_ITEMS: DashboardItemConfig[] = []
const EMPTY_DASHBOARD_TAGS: string[] = []

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
		aiGenerated?: Record<
			string,
			{
				mode: 'create' | 'iterate'
				prompt: string
				rated: boolean
				rating?: number
				feedback?: string
				skipped?: boolean
				timestamp: string
				userId: string
			}
		>
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
		let hasErrors = false
		for (const _ in newErrors) {
			hasErrors = true
			break
		}
		return !hasErrors
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

		let sanitizedItems = EMPTY_DASHBOARD_ITEMS
		if (mode === 'iterate' && existingDashboard && existingDashboard.items) {
			sanitizedItems = sanitizeItemsForAPI(existingDashboard.items)
		}

		let requestBody: Record<string, unknown>
		if (mode === 'iterate') {
			let existingName = ''
			if (existingDashboard && existingDashboard.dashboardName) {
				existingName = existingDashboard.dashboardName
			}
			requestBody = {
				message: aiDescription.trim(),
				mode: 'iterate',
				existingDashboard: {
					dashboardName: existingName,
					items: sanitizedItems,
					aiGenerated: existingDashboard && existingDashboard.aiGenerated
				}
			}
		} else {
			requestBody = {
				message: aiDescription.trim(),
				dashboardName: dashboardName.trim()
			}
		}

		let dashboardNameForGenerate = dashboardName.trim()
		if (mode === 'iterate') {
			dashboardNameForGenerate = ''
			if (existingDashboard && existingDashboard.dashboardName) {
				dashboardNameForGenerate = existingDashboard.dashboardName
			}
		}

		let visibilityForGenerate = visibility
		if (mode === 'iterate') {
			visibilityForGenerate = 'private'
			if (existingDashboard && existingDashboard.visibility) {
				visibilityForGenerate = existingDashboard.visibility
			}
		}

		let tagsForGenerate = tags
		if (mode === 'iterate') {
			tagsForGenerate = EMPTY_DASHBOARD_TAGS
			if (existingDashboard && existingDashboard.tags != null) {
				tagsForGenerate = existingDashboard.tags
			}
		}

		let descriptionForGenerate = ''
		if (mode === 'iterate' && existingDashboard && existingDashboard.description) {
			descriptionForGenerate = existingDashboard.description
		}

		setIsLoading(true)
		let response: Response | null | undefined
		try {
			response = await authorizedFetch(`${MCP_SERVER}/dashboard-creator`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			})
		} catch (error) {
			console.error('Failed to generate dashboard:', error)
			toast.error('Failed to generate dashboard. Please try again.')
			setIsLoading(false)
			return
		}

		if (!response) {
			toast.error('Authentication failed. Please sign in again.')
			setIsLoading(false)
			return
		}

		if (!response.ok) {
			toast.error('Failed to generate dashboard. Please try again.')
			setIsLoading(false)
			return
		}

		let data: any
		try {
			data = await response.json()
		} catch (error) {
			console.error('Failed to parse dashboard response:', error)
			toast.error('Invalid response format from AI service')
			setIsLoading(false)
			return
		}

		if (!data.dashboardConfig || !Array.isArray(data.dashboardConfig.items)) {
			toast.error('Invalid response format from AI service')
			setIsLoading(false)
			return
		}

		const items = data.dashboardConfig.items as DashboardItemConfig[]
		let sessionId: string | undefined
		if (data.metadata && typeof data.metadata.sessionId === 'string') {
			sessionId = data.metadata.sessionId
		}
		let generationMode: 'create' | 'iterate' = mode
		if (data.metadata && (data.metadata.mode === 'create' || data.metadata.mode === 'iterate')) {
			generationMode = data.metadata.mode
		}

		let aiGenerationContext:
			| { sessionId: string; mode: 'create' | 'iterate'; timestamp: string; prompt: string }
			| undefined
		if (sessionId) {
			aiGenerationContext = {
				sessionId,
				mode: generationMode,
				timestamp: new Date().toISOString(),
				prompt: aiDescription.trim()
			}
		}

		onGenerate({
			dashboardName: dashboardNameForGenerate,
			visibility: visibilityForGenerate,
			tags: tagsForGenerate,
			description: descriptionForGenerate,
			items,
			aiGenerationContext
		})

		setDashboardName('')
		setAiDescription('')
		setVisibility('public')
		setTags([])
		setTagInput('')
		setErrors({})
		setTouchedFields({})
		onClose()
		setIsLoading(false)
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
		if (trimmedTag) {
			setTags((prev) => (prev.includes(trimmedTag) ? prev : [...prev, trimmedTag]))
		}
		setTagInput('')
	}

	const handleRemoveTag = (tag: string) => {
		setTags((prev) => prev.filter((t) => t !== tag))
	}

	const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && tagInput.trim()) {
			e.preventDefault()
			handleAddTag(tagInput)
		}
	}

	return (
		<Ariakit.DialogProvider
			open={isOpen}
			setOpen={(open) => {
				if (!open) handleClose()
			}}
		>
			<Ariakit.Dialog
				className="dialog w-full max-w-lg gap-0 border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl"
				unmountOnHide
				portal
				hideOnInteractOutside
			>
				<div className="mb-6 flex items-center justify-between">
					<h2 className="text-xl font-semibold pro-text1">
						{mode === 'iterate' ? 'Edit with LlamaAI' : 'Generate using LlamaAI'}
					</h2>
					<Ariakit.DialogDismiss
						disabled={isLoading}
						className="rounded-md pro-hover-bg p-1 transition-colors disabled:opacity-50"
					>
						<Icon name="x" height={20} width={20} className="pro-text2" />
						<span className="sr-only">Close dialog</span>
					</Ariakit.DialogDismiss>
				</div>

				<div className="space-y-6">
					{mode === 'create' && (
						<div>
							<label htmlFor="generate-dashboard-name" className="mb-3 block text-sm font-medium pro-text1">
								Dashboard Name
							</label>
							<input
								id="generate-dashboard-name"
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
								className={`w-full rounded-md border px-3 py-2 pro-text1 placeholder:pro-text3 focus:outline-hidden ${
									touchedFields.dashboardName && errors.dashboardName
										? 'border-red-500 focus:ring-1 focus:ring-red-500'
										: 'pro-border focus:ring-1 focus:ring-(--primary)'
								} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
								disabled={isLoading}
							/>
							{touchedFields.dashboardName && errors.dashboardName && (
								<p className="mt-1 text-sm text-red-500">{errors.dashboardName}</p>
							)}
						</div>
					)}

					<div>
						<label htmlFor="generate-dashboard-description" className="mb-3 block text-sm font-medium pro-text1">
							{mode === 'iterate'
								? 'Describe what you want to add or change'
								: 'Describe the dashboard you want to create'}
						</label>
						<textarea
							id="generate-dashboard-description"
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
							className={`w-full resize-none rounded-md border px-3 py-2 pro-text1 placeholder:pro-text3 focus:outline-hidden ${
								touchedFields.aiDescription && errors.aiDescription
									? 'border-red-500 focus:ring-1 focus:ring-red-500'
									: 'pro-border focus:ring-1 focus:ring-(--primary)'
							} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
							disabled={isLoading}
						/>
						{touchedFields.aiDescription && errors.aiDescription && (
							<p className="mt-1 text-sm text-red-500">{errors.aiDescription}</p>
						)}
						<p className="mt-1 text-xs pro-text3">
							{mode === 'iterate'
								? 'Be specific about what you want to add, remove, or modify'
								: 'Be specific about what data, charts, and insights you want to see'}{' '}
							({aiDescription.length}/5000)
						</p>
					</div>

					{mode === 'create' && (
						<div>
							<p id="generate-dashboard-visibility" className="mb-3 block text-sm font-medium pro-text1">
								Visibility
							</p>
							<div className="flex gap-3" aria-labelledby="generate-dashboard-visibility">
								<button
									type="button"
									onClick={() => setVisibility('public')}
									disabled={isLoading}
									className={`flex-1 rounded-md border px-4 py-3 transition-colors ${
										visibility === 'public' ? 'pro-btn-blue' : 'pro-border pro-text2 hover:pro-text1'
									} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
								>
									<Icon name="earth" height={16} width={16} className="mr-2 inline" />
									Public
								</button>
								<button
									type="button"
									onClick={() => setVisibility('private')}
									disabled={isLoading}
									className={`flex-1 rounded-md border px-4 py-3 transition-colors ${
										visibility === 'private' ? 'pro-btn-blue' : 'pro-border pro-text2 hover:pro-text1'
									} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
								>
									<Icon name="key" height={16} width={16} className="mr-2 inline" />
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
							<label htmlFor="generate-dashboard-tag-input" className="mb-3 block text-sm font-medium pro-text1">
								Tags
							</label>
							<div className="flex gap-2">
								<input
									id="generate-dashboard-tag-input"
									type="text"
									value={tagInput}
									onChange={(e) => setTagInput(e.target.value)}
									onKeyDown={handleTagInputKeyDown}
									placeholder="Enter tag name"
									className={`flex-1 rounded-md border pro-border px-3 py-2 pro-text1 placeholder:pro-text3 focus:ring-1 focus:ring-(--primary) focus:outline-hidden ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
									disabled={isLoading}
								/>
								<button
									type="button"
									onClick={() => handleAddTag(tagInput)}
									disabled={!tagInput.trim() || isLoading}
									className={`rounded-md border px-4 py-2 transition-colors ${
										tagInput.trim() && !isLoading ? 'pro-btn-blue-outline' : 'cursor-not-allowed pro-border pro-text3'
									}`}
								>
									Add Tag
								</button>
							</div>

							<p className="mt-2 text-xs pro-text3">Press Enter to add tag</p>

							{tags.length > 0 && (
								<div className="mt-3 flex flex-wrap gap-2">
									{tags.map((tag) => (
										<span
											key={tag}
											className="flex items-center gap-1 rounded-md border pro-border px-3 py-1 text-sm pro-text2"
										>
											{tag}
											<button
												type="button"
												onClick={() => handleRemoveTag(tag)}
												className="hover:text-pro-blue-400"
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
					<Ariakit.DialogDismiss
						disabled={isLoading}
						className="flex-1 rounded-md border pro-border pro-hover-bg px-4 py-2 pro-text2 transition-colors hover:pro-text1 disabled:opacity-50"
					>
						Cancel
					</Ariakit.DialogDismiss>
					<button
						type="button"
						onClick={handleGenerate}
						disabled={isLoading}
						className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 transition-colors ${
							!isLoading ? 'animate-ai-glow pro-btn-blue' : 'cursor-not-allowed border pro-border pro-text3'
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
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
