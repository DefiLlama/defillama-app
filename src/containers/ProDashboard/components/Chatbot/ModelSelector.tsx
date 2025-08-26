import { useState, useEffect, useRef } from 'react'
import { Icon } from '~/components/Icon'

interface OpenRouterModel {
	id: string
	name: string
	description?: string
	context_length: number
	pricing: {
		prompt: string
		completion: string
	}
}

interface ModelSelectorProps {
	selectedModel?: string
	onModelSelect: (modelId: string) => void
	disabled?: boolean
}

export const ModelSelector = ({ selectedModel, onModelSelect, disabled = false }: ModelSelectorProps) => {
	const [isOpen, setIsOpen] = useState(false)
	const [models, setModels] = useState<OpenRouterModel[]>([])
	const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([])
	const [loading, setLoading] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [error, setError] = useState<string | null>(null)
	
	const dropdownRef = useRef<HTMLDivElement>(null)
	const searchInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	useEffect(() => {
		if (isOpen && !models.length) {
			fetchModels()
		}
	}, [isOpen])

	useEffect(() => {
		if (isOpen && searchInputRef.current) {
			searchInputRef.current.focus()
		}
	}, [isOpen])

	useEffect(() => {
		const filtered = models.filter(model =>
			model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			model.id.toLowerCase().includes(searchTerm.toLowerCase())
		)
		setFilteredModels(filtered)
	}, [models, searchTerm])

	const fetchModels = async () => {
		setLoading(true)
		setError(null)
		
		try {
			const response = await fetch('http://localhost:3001/api/models')
			if (!response.ok) {
				throw new Error(`Failed to fetch models: ${response.statusText}`)
			}
			
			const data = await response.json()
			setModels(data.models || [])
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Failed to load models')
			console.error('Error fetching models:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleModelSelect = (modelId: string) => {
		onModelSelect(modelId)
		setIsOpen(false)
		setSearchTerm('')
	}

	const selectedModelInfo = models.find(m => m.id === selectedModel)

	const formatPrice = (price: string) => {
		const num = parseFloat(price)
		if (num === 0) return 'Free'
		if (num < 0.000001) return '<$0.000001'
		return `$${num.toFixed(6)}`
	}

	const getProviderName = (modelId: string) => {
		if (modelId.includes('openai')) return 'OpenAI'
		if (modelId.includes('anthropic')) return 'Anthropic'
		if (modelId.includes('google')) return 'Google'
		if (modelId.includes('meta')) return 'Meta'
		if (modelId.includes('microsoft')) return 'Microsoft'
		if (modelId.includes('mistral')) return 'Mistral'
		return 'Other'
	}

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={`flex items-center gap-2 rounded border border-(--form-control-border) bg-(--bg-main) px-2 py-1 text-xs text-(--text-primary) transition-colors ${
					!disabled ? 'hover:border-(--primary) hover:bg-(--bg-secondary)' : 'cursor-not-allowed opacity-50'
				}`}
				title="Select AI Model"
			>
				<Icon name="key" height={12} width={12} />
				<span className="max-w-24 truncate">
					{selectedModelInfo?.name || 'Default Model'}
				</span>
				<Icon 
					name="chevron-down" 
					height={10} 
					width={10} 
					className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
				/>
			</button>

			{isOpen && (
				<div className="absolute top-full left-0 z-50 mt-1 w-80 rounded border border-(--form-control-border) bg-(--bg-main) shadow-lg">
					<div className="p-2">
						<input
							ref={searchInputRef}
							type="text"
							placeholder="Search models..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded border border-(--form-control-border) bg-(--bg-secondary) px-2 py-1 text-xs text-(--text-primary) focus:border-(--primary) focus:outline-none"
						/>
					</div>

					<div className="max-h-64 overflow-y-auto">
						{loading ? (
							<div className="flex items-center justify-center p-4 text-(--text-secondary)">
								Loading models...
							</div>
						) : error ? (
							<div className="p-4 text-center text-red-500">
								<p className="text-xs">{error}</p>
								<button
									onClick={fetchModels}
									className="mt-2 text-xs text-(--primary) hover:underline"
								>
									Retry
								</button>
							</div>
						) : filteredModels.length === 0 ? (
							<div className="p-4 text-center text-(--text-secondary)">
								<p className="text-xs">No models found</p>
							</div>
						) : (
							filteredModels.map((model) => (
								<button
									key={model.id}
									onClick={() => handleModelSelect(model.id)}
									className={`w-full px-3 py-2 text-left transition-colors hover:bg-(--bg-secondary) ${
										selectedModel === model.id ? 'bg-(--bg-tertiary)' : ''
									}`}
								>
									<div className="flex items-center justify-between">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="text-xs font-medium text-(--text-primary) truncate">
													{model.name}
												</span>
												<span className="text-xs text-(--text-secondary) bg-(--bg-tertiary) px-1 rounded">
													{getProviderName(model.id)}
												</span>
											</div>
											{model.description && (
												<p className="text-xs text-(--text-secondary) mt-1 line-clamp-2">
													{model.description}
												</p>
											)}
											<div className="flex items-center gap-3 mt-1">
												<span className="text-xs text-(--text-secondary)">
													Context: {model.context_length?.toLocaleString() || 'N/A'}
												</span>
												<span className="text-xs text-(--text-secondary)">
													Price: {formatPrice(model.pricing?.prompt || '0')}/1K tokens
												</span>
											</div>
										</div>
										{selectedModel === model.id && (
											<Icon name="check" height={12} width={12} className="text-(--primary) ml-2" />
										)}
									</div>
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	)
}