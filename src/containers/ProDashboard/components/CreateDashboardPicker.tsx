import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { fetchChainsByCategory as fetchChainsByCategoryApi } from '~/containers/Chains/api'
import { useAppMetadata } from '../AppMetadataContext'
import { useDimensionProtocols } from '../hooks/useDimensionProtocols'
import { useProDashboardCatalog } from '../ProDashboardAPIContext'
import {
	DASHBOARD_TEMPLATES,
	generateTemplateCharts,
	type ChainCategoryData,
	type DashboardTemplate
} from '../templates'
import type { DashboardItemConfig } from '../types'
import { CHART_TYPES } from '../types'
import type { ComparisonPreset } from './ComparisonWizard/types'

const ComparisonWizard = lazy(() => import('./ComparisonWizard').then((m) => ({ default: m.ComparisonWizard })))

type PickerMode = 'picker' | 'scratch' | 'comparison'

interface CreateDashboardPickerProps {
	dialogStore: Ariakit.DialogStore
	onCreate: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items?: DashboardItemConfig[]
	}) => void
	comparisonPreset?: ComparisonPreset | null
}

async function fetchChainsByCategory(category: string): Promise<{ category: string; chains: string[] }> {
	return fetchChainsByCategoryApi(category)
		.then((data) => {
			const chains = Array.isArray(data?.chainsUnique) ? (data.chainsUnique as string[]) : []
			return { category, chains }
		})
		.catch(() => ({ category, chains: [] }))
}

export function CreateDashboardPicker({ dialogStore, onCreate, comparisonPreset }: CreateDashboardPickerProps) {
	const [mode, setMode] = useState<PickerMode>('picker')
	const [comparisonPresetHandled, setComparisonPresetHandled] = useState(false)
	const { protocols, chains } = useProDashboardCatalog()
	const { protocolsBySlug } = useAppMetadata()

	const { data: chainCategoriesData } = useQuery({
		queryKey: ['pro-dashboard', 'chain-categories-for-templates'],
		queryFn: async () => {
			const categoriesToFetch = ['Rollup']
			const results = await Promise.all(categoriesToFetch.map((category) => fetchChainsByCategory(category)))
			return results
		},
		staleTime: 60 * 60 * 1000
	})

	const chainCategoryData = useMemo<ChainCategoryData>(() => {
		const chainsInCategory = new Map<string, Set<string>>()
		if (chainCategoriesData) {
			for (const { category, chains } of chainCategoriesData) {
				chainsInCategory.set(category, new Set(chains))
			}
		}
		return { chainsInCategory }
	}, [chainCategoriesData])

	const { dimensionProtocols } = useDimensionProtocols()
	const effectiveMode: PickerMode = comparisonPreset && !comparisonPresetHandled ? 'comparison' : mode

	const handleClose = () => {
		setMode('picker')
		setComparisonPresetHandled(false)
		dialogStore.toggle()
	}

	const handleCreateFromScratch = (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
	}) => {
		onCreate(data)
		setMode('picker')
		setComparisonPresetHandled(false)
	}

	const handleCreateComparison = (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
		items: DashboardItemConfig[]
	}) => {
		onCreate(data)
		setMode('picker')
		setComparisonPresetHandled(false)
		dialogStore.toggle()
	}

	const handleBackToPicker = () => {
		setComparisonPresetHandled(true)
		setMode('picker')
	}

	const handleCreateFromTemplate = (template: DashboardTemplate) => {
		const items = generateTemplateCharts(
			template,
			protocols,
			chains,
			protocolsBySlug,
			CHART_TYPES,
			chainCategoryData,
			dimensionProtocols
		)

		onCreate({
			dashboardName: template.name,
			visibility: 'private',
			tags: [],
			description: template.description,
			items
		})
		setComparisonPresetHandled(false)
		dialogStore.toggle()
	}

	if (effectiveMode === 'scratch') {
		return (
			<Ariakit.Dialog
				store={dialogStore}
				className="dialog w-full max-w-lg gap-0 border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-0 shadow-2xl"
			>
				<div className="flex items-center gap-2 border-b border-(--cards-border) px-6 py-4">
					<button
						type="button"
						onClick={handleBackToPicker}
						className="rounded-md p-1 text-(--text-tertiary) transition-colors hover:bg-(--cards-bg-alt) hover:text-(--text-primary)"
					>
						<Icon name="arrow-left" height={18} width={18} />
					</button>
					<h2 className="text-lg font-semibold text-(--text-primary)">Create New Dashboard</h2>
				</div>
				<CreateDashboardModalContent onCreate={handleCreateFromScratch} />
			</Ariakit.Dialog>
		)
	}

	if (effectiveMode === 'comparison') {
		return (
			<Ariakit.Dialog
				store={dialogStore}
				className="dialog w-full max-w-4xl gap-0 border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-0 shadow-2xl"
			>
				<div className="flex items-center justify-between border-b border-(--cards-border) px-6 py-4">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleBackToPicker}
							className="rounded-md p-1 text-(--text-tertiary) transition-colors hover:bg-(--cards-bg-alt) hover:text-(--text-primary)"
						>
							<Icon name="arrow-left" height={18} width={18} />
						</button>
						<h2 className="text-lg font-semibold text-(--text-primary)">Create Comparison Dashboard</h2>
					</div>
					<Ariakit.DialogDismiss
						onClick={handleClose}
						className="rounded-md p-1 text-(--text-tertiary) transition-colors hover:bg-(--cards-bg-alt) hover:text-(--text-primary)"
					>
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
				</div>
				<Suspense
					fallback={
						<div className="flex h-96 items-center justify-center">
							<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-(--primary)" />
						</div>
					}
				>
					<ComparisonWizard onComplete={handleCreateComparison} comparisonPreset={comparisonPreset ?? undefined} />
				</Suspense>
			</Ariakit.Dialog>
		)
	}

	return (
		<Ariakit.Dialog
			store={dialogStore}
			className="dialog w-full max-w-3xl gap-0 border pro-dashboard border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl"
		>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-xl font-semibold text-(--text-primary)">Create New Dashboard</h2>
				<Ariakit.DialogDismiss
					onClick={handleClose}
					className="rounded-md p-1 text-(--text-tertiary) transition-colors hover:bg-(--cards-bg-alt) hover:text-(--text-primary)"
				>
					<Icon name="x" height={20} width={20} />
					<span className="sr-only">Close dialog</span>
				</Ariakit.DialogDismiss>
			</div>

			<p className="mb-6 text-sm text-(--text-secondary)">How would you like to create your dashboard?</p>

			<div className="grid gap-4 sm:grid-cols-2">
				<button
					type="button"
					onClick={() => {
						setComparisonPresetHandled(true)
						setMode('scratch')
					}}
					className="flex flex-col items-center gap-4 rounded-xl border-2 border-(--cards-border) bg-(--cards-bg) p-6 text-center transition-all hover:border-(--primary)/40 hover:bg-(--cards-bg-alt)/50"
				>
					<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--cards-bg-alt) text-(--text-secondary)">
						<Icon name="file-plus" height={28} width={28} />
					</div>
					<div>
						<h3 className="text-base font-semibold text-(--text-primary)">From Scratch</h3>
						<p className="mt-1 text-sm text-(--text-tertiary)">Create an empty dashboard and add charts manually</p>
					</div>
				</button>

				<button
					type="button"
					onClick={() => {
						setComparisonPresetHandled(true)
						setMode('comparison')
					}}
					className="flex flex-col items-center gap-4 rounded-xl border-2 border-(--cards-border) bg-(--cards-bg) p-6 text-center transition-all hover:border-(--primary)/40 hover:bg-(--cards-bg-alt)/50"
				>
					<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--primary)/10 text-(--primary)">
						<Icon name="bar-chart-2" height={28} width={28} />
					</div>
					<div>
						<h3 className="text-base font-semibold text-(--text-primary)">Comparison</h3>
						<p className="mt-1 text-sm text-(--text-tertiary)">Compare chains or protocols with pre-built charts</p>
					</div>
				</button>
			</div>

			<div className="mt-6 border-t border-(--cards-border) pt-6">
				<h3 className="mb-3 text-sm font-medium text-(--text-secondary)">Or use a template</h3>
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{DASHBOARD_TEMPLATES.map((template) => (
						<button
							key={template.id}
							type="button"
							onClick={() => handleCreateFromTemplate(template)}
							className="rounded-lg border border-(--cards-border) p-2.5 text-left transition-colors hover:border-(--primary)/40 hover:bg-(--cards-bg-alt)/50"
						>
							<div className="text-sm font-medium text-(--text-primary)">{template.name}</div>
							<div className="mt-0.5 line-clamp-1 text-xs text-(--text-tertiary)">{template.description}</div>
						</button>
					))}
				</div>
			</div>
		</Ariakit.Dialog>
	)
}

function CreateDashboardModalContent({
	onCreate
}: {
	onCreate: (data: {
		dashboardName: string
		visibility: 'private' | 'public'
		tags: string[]
		description: string
	}) => void
}) {
	const [visibility, setVisibility] = useState<'private' | 'public'>('public')
	const [tags, setTags] = useState<string[]>([])
	const tagInputRef = useRef<HTMLInputElement>(null)
	const charCountRef = useRef<HTMLSpanElement>(null)

	const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const form = e.currentTarget
		const formData = new FormData(form)
		const dashboardName = (formData.get('dashboardName') as string)?.trim() ?? ''
		const description = (formData.get('description') as string)?.slice(0, 200) ?? ''

		const nameInput = form.elements.namedItem('dashboardName') as HTMLInputElement | null
		if (!dashboardName) {
			nameInput?.setCustomValidity('Dashboard name is required')
			nameInput?.reportValidity()
			return
		}

		onCreate({ dashboardName, visibility, tags, description })
	}

	const handleAddTag = () => {
		const input = tagInputRef.current
		if (!input) return
		const trimmedTag = input.value.trim().toLowerCase()
		if (trimmedTag) {
			setTags((prev) => (prev.includes(trimmedTag) ? prev : [...prev, trimmedTag]))
		}
		input.value = ''
	}

	const handleRemoveTag = (tag: string) => {
		setTags((prev) => prev.filter((t) => t !== tag))
	}

	const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleAddTag()
		}
	}

	return (
		<form className="p-6" onSubmit={handleCreate}>
			<div className="space-y-6">
				<div>
					<label htmlFor="create-dashboard-name" className="mb-3 block text-sm font-medium text-(--text-primary)">
						Dashboard Name
					</label>
					<input
						id="create-dashboard-name"
						name="dashboardName"
						type="text"
						onInput={(e) => e.currentTarget.setCustomValidity('')}
						placeholder="Enter dashboard name"
						className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						required
					/>
				</div>

				<div>
					<p id="create-dashboard-visibility" className="mb-3 block text-sm font-medium text-(--text-primary)">
						Visibility
					</p>
					<div className="flex gap-3" role="group" aria-labelledby="create-dashboard-visibility">
						<button
							type="button"
							onClick={() => setVisibility('public')}
							className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-3 transition-colors ${
								visibility === 'public'
									? 'border-(--primary) bg-(--primary)/10 font-medium text-(--primary)'
									: 'border-(--form-control-border) text-(--text-secondary) hover:border-(--primary)/40'
							}`}
						>
							<Icon name="earth" height={16} width={16} />
							Public
						</button>
						<button
							type="button"
							onClick={() => setVisibility('private')}
							className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-3 transition-colors ${
								visibility === 'private'
									? 'border-(--primary) bg-(--primary)/10 font-medium text-(--primary)'
									: 'border-(--form-control-border) text-(--text-secondary) hover:border-(--primary)/40'
							}`}
						>
							<Icon name="key" height={16} width={16} />
							Private
						</button>
					</div>
					{visibility === 'public' && (
						<p className="mt-2 text-sm text-(--text-tertiary)">Public dashboards are visible in the Discover tab</p>
					)}
				</div>

				<div>
					<label htmlFor="create-dashboard-tag-input" className="mb-3 block text-sm font-medium text-(--text-primary)">
						Tags
					</label>
					<div className="flex gap-2">
						<input
							id="create-dashboard-tag-input"
							ref={tagInputRef}
							type="text"
							onKeyDown={handleTagInputKeyDown}
							placeholder="Enter tag name"
							className="flex-1 rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
						<button
							type="button"
							onClick={handleAddTag}
							className="rounded-md border border-(--primary)/40 px-4 py-2 text-(--primary) transition-colors hover:bg-(--primary)/10"
						>
							Add Tag
						</button>
					</div>
					<p className="mt-2 text-xs text-(--text-tertiary)">Press Enter to add tag</p>
					{tags.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-2">
							{tags.map((tag) => (
								<span
									key={tag}
									className="flex items-center gap-1 rounded-md border border-(--cards-border) px-3 py-1 text-sm text-(--text-secondary)"
								>
									{tag}
									<button
										type="button"
										onClick={() => handleRemoveTag(tag)}
										aria-label={`Remove tag ${tag}`}
										className="text-(--text-tertiary) hover:text-(--primary)"
									>
										<Icon name="x" height={12} width={12} />
									</button>
								</span>
							))}
						</div>
					)}
				</div>

				<div>
					<label
						htmlFor="create-dashboard-description"
						className="mb-3 block text-sm font-medium text-(--text-primary)"
					>
						Description
					</label>
					<textarea
						id="create-dashboard-description"
						name="description"
						onInput={(e) => {
							if (charCountRef.current)
								charCountRef.current.textContent = String(e.currentTarget.value.length)
						}}
						placeholder="Describe your dashboard..."
						maxLength={200}
						rows={3}
						className="w-full resize-none rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
					<p className="mt-1 text-xs text-(--text-tertiary)">
						<span ref={charCountRef}>0</span>/200 characters
					</p>
				</div>
			</div>

			<div className="mt-8 flex gap-3">
				<Ariakit.DialogDismiss
					type="button"
					className="flex-1 rounded-md border border-(--form-control-border) px-4 py-2 text-(--text-secondary) transition-colors hover:bg-(--cards-bg-alt) hover:text-(--text-primary)"
				>
					Cancel
				</Ariakit.DialogDismiss>
				<button
					type="submit"
					data-umami-event="dashboard-create"
					className="flex-1 rounded-md bg-(--primary) px-4 py-2 font-medium text-white transition-colors hover:bg-(--primary)/90"
				>
					Create Dashboard
				</button>
			</div>
		</form>
	)
}
