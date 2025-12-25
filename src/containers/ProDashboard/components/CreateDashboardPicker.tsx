import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { CHAINS_API_V2 } from '~/constants'
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

const CreateDashboardModal = lazy(() =>
	import('./CreateDashboardModal').then((m) => ({ default: m.CreateDashboardModal }))
)

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
}

export function CreateDashboardPicker({ dialogStore, onCreate }: CreateDashboardPickerProps) {
	const [mode, setMode] = useState<PickerMode>('picker')
	const isOpen = dialogStore.useState('open')
	const { protocols, chains } = useProDashboardCatalog()
	const { protocolsBySlug } = useAppMetadata()

	const { data: chainCategoriesData } = useQuery({
		queryKey: ['chain-categories-for-templates'],
		queryFn: async () => {
			const categoriesToFetch = ['Rollup']
			const results = await Promise.all(
				categoriesToFetch.map(async (cat) => {
					try {
						const res = await fetch(`${CHAINS_API_V2}/${encodeURIComponent(cat)}`)
						if (!res.ok) return { category: cat, chains: [] as string[] }
						const data = await res.json()
						return { category: cat, chains: (data?.chainsUnique as string[]) || [] }
					} catch {
						return { category: cat, chains: [] as string[] }
					}
				})
			)
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

	useEffect(() => {
		if (!isOpen) {
			setMode('picker')
		}
	}, [isOpen])

	const handleClose = () => {
		setMode('picker')
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
		dialogStore.toggle()
	}

	const handleBackToPicker = () => {
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
		dialogStore.toggle()
	}

	if (mode === 'scratch') {
		return (
			<Ariakit.Dialog
				store={dialogStore}
				className="pro-dashboard dialog w-full max-w-lg gap-0 border border-(--cards-border) bg-(--cards-bg) p-0 shadow-2xl"
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
				<Suspense
					fallback={
						<div className="flex h-96 items-center justify-center">
							<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-(--primary)" />
						</div>
					}
				>
					<CreateDashboardModalContent onCreate={handleCreateFromScratch} />
				</Suspense>
			</Ariakit.Dialog>
		)
	}

	if (mode === 'comparison') {
		return (
			<Ariakit.Dialog
				store={dialogStore}
				className="pro-dashboard dialog w-full max-w-4xl gap-0 border border-(--cards-border) bg-(--cards-bg) p-0 shadow-2xl"
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
					<ComparisonWizard onComplete={handleCreateComparison} />
				</Suspense>
			</Ariakit.Dialog>
		)
	}

	return (
		<Ariakit.Dialog
			store={dialogStore}
			className="pro-dashboard dialog w-full max-w-3xl gap-0 border border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl"
		>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-xl font-semibold text-(--text-primary)">Create New Dashboard</h2>
				<Ariakit.DialogDismiss className="rounded-md p-1 text-(--text-tertiary) transition-colors hover:bg-(--cards-bg-alt) hover:text-(--text-primary)">
					<Icon name="x" height={20} width={20} />
					<span className="sr-only">Close dialog</span>
				</Ariakit.DialogDismiss>
			</div>

			<p className="mb-6 text-sm text-(--text-secondary)">How would you like to create your dashboard?</p>

			<div className="grid gap-4 sm:grid-cols-2">
				<button
					type="button"
					onClick={() => setMode('scratch')}
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
					onClick={() => setMode('comparison')}
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
	const [dashboardName, setDashboardName] = useState('')
	const [visibility, setVisibility] = useState<'private' | 'public'>('public')
	const [tags, setTags] = useState<string[]>([])
	const [description, setDescription] = useState('')
	const [tagInput, setTagInput] = useState('')

	const handleCreate = () => {
		if (!dashboardName.trim()) return
		onCreate({
			dashboardName: dashboardName.trim(),
			visibility,
			tags,
			description
		})
		setDashboardName('')
		setVisibility('public')
		setTags([])
		setDescription('')
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
		<div className="p-6">
			<div className="space-y-6">
				<div>
					<label className="mb-3 block text-sm font-medium text-(--text-primary)">Dashboard Name</label>
					<input
						type="text"
						value={dashboardName}
						onChange={(e) => setDashboardName(e.target.value)}
						placeholder="Enter dashboard name"
						className="w-full rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						autoFocus
					/>
				</div>

				<div>
					<label className="mb-3 block text-sm font-medium text-(--text-primary)">Visibility</label>
					<div className="flex gap-3">
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
					<label className="mb-3 block text-sm font-medium text-(--text-primary)">Tags</label>
					<div className="flex gap-2">
						<input
							type="text"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={handleTagInputKeyDown}
							placeholder="Enter tag name"
							className="flex-1 rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
						/>
						<button
							type="button"
							onClick={() => handleAddTag(tagInput)}
							disabled={!tagInput.trim()}
							className={`rounded-md border px-4 py-2 transition-colors ${
								tagInput.trim()
									? 'border-(--primary)/40 text-(--primary) hover:bg-(--primary)/10'
									: 'cursor-not-allowed border-(--form-control-border) text-(--text-tertiary)'
							}`}
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
										onClick={() => handleRemoveTag(tag)}
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
					<label className="mb-3 block text-sm font-medium text-(--text-primary)">Description</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Describe your dashboard..."
						rows={3}
						className="w-full resize-none rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 placeholder:text-(--text-tertiary) focus:border-(--primary) focus:ring-1 focus:ring-(--primary) focus:outline-hidden"
					/>
					<p className="mt-1 text-xs text-(--text-tertiary)">{description.length}/200 characters</p>
				</div>
			</div>

			<div className="mt-8 flex gap-3">
				<Ariakit.DialogDismiss className="flex-1 rounded-md border border-(--form-control-border) px-4 py-2 text-(--text-secondary) transition-colors hover:bg-(--cards-bg-alt) hover:text-(--text-primary)">
					Cancel
				</Ariakit.DialogDismiss>
				<button
					type="button"
					data-umami-event="dashboard-create"
					onClick={handleCreate}
					disabled={!dashboardName.trim()}
					className={`flex-1 rounded-md px-4 py-2 font-medium transition-colors ${
						dashboardName.trim()
							? 'bg-(--primary) text-white hover:bg-(--primary)/90'
							: 'cursor-not-allowed border border-(--form-control-border) text-(--text-tertiary)'
					}`}
				>
					Create Dashboard
				</button>
			</div>
		</div>
	)
}
