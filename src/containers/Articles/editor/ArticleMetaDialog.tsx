import * as Ariakit from '@ariakit/react'
import type { Dispatch, SetStateAction } from 'react'
import { EDITORIAL_TAGS, isEditorialTagSlug } from '../editorialTags'
import type { ArticleCollaborator, ArticleImage, ArticleSection, LocalArticleDocument } from '../types'
import { ARTICLE_SECTIONS, ARTICLE_SECTION_LABELS, ARTICLE_SECTION_SLUGS } from '../types'
import { ImageUploadButton } from '../upload/ImageUploadButton'
import { PdfUploadButton } from '../upload/PdfUploadButton'
import { Icon } from './ArticleEditorIcon'
import type { ArticleFieldUpdater } from './ArticleEditorTypes'
import { formatArticleDate, fromDateTimeLocal, slugFromTitle, toDateTimeLocal } from './ArticleEditorUtils'
import { MetaFieldHint, MetaSection, MetaSwitch } from './ArticleMetaFields'

type DialogStore = ReturnType<typeof Ariakit.useDialogStore>

type ArticleMetaDialogProps = {
	article: LocalArticleDocument
	collaboratorAdding: boolean
	collaboratorEmail: string
	collaboratorError: string | null
	collaborators: ArticleCollaborator[]
	collaboratorsLoadError: string | null
	collaboratorsLoading: boolean
	hasPendingEdits: boolean
	isCollaborator: boolean
	isDirty: boolean
	isDiscarding: boolean
	isOwner: boolean
	isPublished: boolean
	isPublishing: boolean
	isSaving: boolean
	publishErrors: Record<string, string>
	store: DialogStore
	handleAddCollaborator: () => Promise<void>
	handlePublish: () => Promise<boolean>
	handleRemoveCollaborator: (pbUserId: string) => Promise<void>
	handleToggleHidden: (pbUserId: string, nextHidden: boolean) => Promise<void>
	handleTransferOwnership: (pbUserId: string, displayName: string) => Promise<void>
	saveArticle: () => Promise<void>
	setCollaboratorEmail: Dispatch<SetStateAction<string>>
	setCollaboratorError: Dispatch<SetStateAction<string | null>>
	updateArticle: ArticleFieldUpdater
}

export function ArticleMetaDialog({
	article,
	collaboratorAdding,
	collaboratorEmail,
	collaboratorError,
	collaborators,
	collaboratorsLoadError,
	collaboratorsLoading,
	handleAddCollaborator,
	handlePublish,
	handleRemoveCollaborator,
	handleToggleHidden,
	handleTransferOwnership,
	hasPendingEdits,
	isCollaborator,
	isDirty,
	isDiscarding,
	isOwner,
	isPublished,
	isPublishing,
	isSaving,
	publishErrors,
	saveArticle,
	setCollaboratorEmail,
	setCollaboratorError,
	store,
	updateArticle
}: ArticleMetaDialogProps) {
	return (
		<Ariakit.Dialog
			store={store}
			backdrop={
				<div className="fixed inset-0 z-40 bg-black/30 opacity-0 backdrop-blur-sm transition-opacity duration-200 data-[enter]:opacity-100 data-[leave]:opacity-0" />
			}
			className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md translate-x-full flex-col overflow-y-auto border-l border-(--cards-border) bg-(--cards-bg) p-6 shadow-2xl transition-transform duration-300 data-[enter]:translate-x-0 data-[leave]:translate-x-full"
		>
			<div className="mb-1 flex items-start justify-between gap-3">
				<div className="grid gap-1">
					<Ariakit.DialogHeading className="text-lg font-semibold tracking-tight text-(--text-primary)">
						{isPublished ? 'Edit listing' : 'Review & publish'}
					</Ariakit.DialogHeading>
					<p className="text-xs text-(--text-tertiary)">
						{isPublished
							? 'These details appear on the public article page and in shares.'
							: 'A quick review before this goes live.'}
					</p>
				</div>
				<Ariakit.DialogDismiss
					aria-label="Close"
					className="rounded-md p-1.5 text-(--text-secondary) hover:bg-(--link-hover-bg)"
				>
					<Icon name="x" className="h-4 w-4" />
				</Ariakit.DialogDismiss>
			</div>

			<div className="mt-6 grid gap-6">
				<MetaSection title="Section">
					<div className="grid gap-1.5">
						<Ariakit.SelectProvider
							value={article.section ?? ''}
							setValue={(v) => {
								const next = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : ''
								updateArticle('section', (next || null) as ArticleSection | null)
							}}
						>
							<Ariakit.Select
								aria-label="Article section"
								className={`flex h-10 items-center justify-between gap-2 rounded-md border bg-(--app-bg) px-3 text-sm transition-colors focus-visible:border-(--link-text) focus-visible:outline-none data-[state=open]:border-(--link-text) ${
									publishErrors.section
										? 'border-red-500/60 text-(--text-primary)'
										: article.section
											? 'border-(--form-control-border) text-(--text-primary) hover:border-(--text-tertiary)'
											: 'border-(--form-control-border) text-(--text-tertiary) hover:border-(--text-tertiary)'
								}`}
							>
								<span className="truncate text-left">
									{article.section ? ARTICLE_SECTION_LABELS[article.section] : 'Select a section…'}
								</span>
								<Ariakit.SelectArrow className="shrink-0 text-(--text-tertiary)" />
							</Ariakit.Select>
							<Ariakit.SelectPopover
								gutter={6}
								sameWidth
								portal
								unmountOnHide
								className="z-[90] flex flex-col overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg) py-1 text-sm shadow-xl outline-none"
							>
								{ARTICLE_SECTIONS.map((section) => (
									<Ariakit.SelectItem
										key={section}
										value={section}
										className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-(--text-secondary) data-active-item:bg-(--link-button) data-active-item:text-(--link-text)"
									>
										<span className="truncate">{ARTICLE_SECTION_LABELS[section]}</span>
										<Ariakit.SelectItemCheck className="shrink-0 text-(--link-text)" />
									</Ariakit.SelectItem>
								))}
							</Ariakit.SelectPopover>
						</Ariakit.SelectProvider>
						<MetaFieldHint error={publishErrors.section}>
							Required. Drives the URL path:{' '}
							<span className="font-jetbrains text-(--text-secondary)">
								/research/{article.section ?? '…'}/{article.slug || '…'}
							</span>
						</MetaFieldHint>
					</div>
				</MetaSection>

				{article.section === 'report' ? (
					<MetaSection title="Report">
						<div className="grid gap-1.5">
							<span className="text-xs text-(--text-secondary)">Carousel image</span>
							<ImageUploadButton
								scope="report-carousel"
								articleId={article.id ?? null}
								currentUrl={article.carouselImage?.url ?? null}
								label="carousel image"
								helperText="Used on the rotating hero carousel on /research. Falls back to the cover image."
								previewShape="wide"
								onUploaded={(result) =>
									updateArticle('carouselImage', {
										url: result.url,
										width: result.width,
										height: result.height
									} as ArticleImage)
								}
								onCleared={() => updateArticle('carouselImage', null)}
							/>
						</div>
						<div className="grid gap-1.5">
							<span className="text-xs text-(--text-secondary)">Sponsor logo</span>
							<ImageUploadButton
								scope="report-sponsor-logo"
								articleId={article.id ?? null}
								currentUrl={article.sponsorLogo?.url ?? null}
								label="sponsor logo"
								helperText="Shown as a 'Sponsored by' badge on the report card."
								previewShape="square"
								onUploaded={(result) =>
									updateArticle('sponsorLogo', {
										url: result.url,
										width: result.width,
										height: result.height
									} as ArticleImage)
								}
								onCleared={() => updateArticle('sponsorLogo', null)}
							/>
						</div>
						<label className="grid gap-1.5">
							<span className="flex items-baseline justify-between gap-2 text-xs text-(--text-secondary)">
								<span>Report description</span>
								<span className="font-jetbrains text-[10px] text-(--text-tertiary)">
									{(article.reportDescription ?? '').length}/600
								</span>
							</span>
							<textarea
								value={article.reportDescription ?? ''}
								onChange={(event) => updateArticle('reportDescription', event.target.value.slice(0, 600))}
								placeholder="Shown on hover over the report card in the /research carousel."
								rows={4}
								maxLength={600}
								className="resize-none rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
							/>
						</label>
						<div className="grid gap-1.5">
							<span className="text-xs text-(--text-secondary)">Report PDF</span>
							<PdfUploadButton
								articleId={article.id ?? null}
								currentPdf={article.reportPdf ?? null}
								helperText="Downloadable from the article page and the /research carousel."
								onUploaded={(result) =>
									updateArticle('reportPdf', {
										id: result.id,
										url: result.url,
										sizeBytes: result.sizeBytes,
										...(result.originalName ? { originalName: result.originalName } : {})
									})
								}
								onCleared={() => updateArticle('reportPdf', null)}
							/>
						</div>
					</MetaSection>
				) : null}

				<MetaSection title="Publishing">
					<label className="grid gap-1.5">
						<span className="flex items-baseline justify-between gap-2 text-xs text-(--text-secondary)">
							<span>Display date</span>
							<button
								type="button"
								onClick={() => updateArticle('displayDate', new Date().toISOString())}
								className="font-jetbrains text-[10px] tracking-[0.16em] text-(--text-tertiary) uppercase transition-colors hover:text-(--link-text)"
							>
								Set to now
							</button>
						</span>
						<input
							type="datetime-local"
							value={toDateTimeLocal(article.displayDate)}
							onChange={(event) => updateArticle('displayDate', fromDateTimeLocal(event.target.value))}
							onClick={(event) => {
								const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void }
								input.showPicker?.()
							}}
							onFocus={(event) => {
								const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void }
								input.showPicker?.()
							}}
							className={`cursor-pointer rounded-md border bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors focus:outline-none ${
								publishErrors.displayDate
									? 'border-red-500/60 focus:border-red-500'
									: 'border-(--form-control-border) focus:border-(--link-text)'
							}`}
						/>
						<MetaFieldHint error={publishErrors.displayDate}>
							Shown on cards and the article header. Defaults to publish time.
						</MetaFieldHint>
					</label>
					{article.firstPublishedAt || article.lastPublishedAt ? (
						<div className="grid gap-1 rounded-md border border-(--cards-border) bg-(--app-bg)/50 px-3 py-2.5">
							{article.firstPublishedAt ? (
								<div className="flex items-baseline justify-between gap-3">
									<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
										First publish
									</span>
									<span className="font-jetbrains text-[11px] text-(--text-secondary) tabular-nums">
										{formatArticleDate(article.firstPublishedAt)}
									</span>
								</div>
							) : null}
							{article.lastPublishedAt ? (
								<div className="flex items-baseline justify-between gap-3">
									<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
										Last publish
									</span>
									<span className="font-jetbrains text-[11px] text-(--text-secondary) tabular-nums">
										{formatArticleDate(article.lastPublishedAt)}
									</span>
								</div>
							) : null}
						</div>
					) : null}
					<div className="-mx-3 grid">
						<MetaSwitch
							checked={article.brandByline === true}
							onCheckedChange={(next) => updateArticle('brandByline', next)}
							label="Publish as DefiLlama Research"
							description="Replaces the per-user byline with the institutional name and emits Organization JSON-LD."
						/>
					</div>
					{article.editorialTags && article.editorialTags.length > 0 ? (
						<div className="grid gap-1.5">
							<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
								Editorial
							</span>
							<div className="flex flex-wrap gap-1.5">
								{article.editorialTags.filter(isEditorialTagSlug).map((slug) => (
									<span
										key={slug}
										className="inline-flex items-center gap-1 rounded-full bg-(--link-button) px-2 py-0.5 font-jetbrains text-[10px] tracking-[0.18em] text-(--link-text) uppercase"
									>
										{EDITORIAL_TAGS[slug].label}
									</span>
								))}
							</div>
							<p className="text-xs text-(--text-tertiary)">Managed by editors from /research/admin/curation.</p>
						</div>
					) : null}
				</MetaSection>

				<MetaSection title="URL">
					<div className="grid gap-1.5">
						<div className="flex items-stretch gap-1.5">
							<input
								value={article.slug}
								onChange={(event) => updateArticle('slug', event.target.value)}
								className="flex-1 rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 font-jetbrains text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
							/>
							{(() => {
								const candidate = slugFromTitle(article.title)
								const disabled = !article.title.trim() || candidate === article.slug
								return (
									<button
										type="button"
										disabled={disabled}
										onClick={() => updateArticle('slug', candidate)}
										title={
											disabled
												? candidate === article.slug
													? 'Slug already matches title'
													: 'Add a title first'
												: `Regenerate as ${candidate}`
										}
										className="flex shrink-0 items-center gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) px-2.5 font-jetbrains text-[10px] tracking-[0.16em] text-(--text-secondary) uppercase transition-colors hover:border-(--link-text)/40 hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-(--cards-border) disabled:hover:text-(--text-secondary)"
									>
										<span aria-hidden>↻</span>
										<span>Regenerate</span>
									</button>
								)
							})()}
						</div>
						<span className="truncate font-jetbrains text-[10px] text-(--text-tertiary)">
							defillama.com/research/{article.section ? `${ARTICLE_SECTION_SLUGS[article.section]}/` : ''}
							<span className="text-(--text-secondary)">{article.slug}</span>
						</span>
					</div>
				</MetaSection>

				<MetaSection title="Listing">
					<label className="grid gap-1.5">
						<span className="text-xs text-(--text-secondary)">Subtitle</span>
						<input
							value={article.subtitle ?? ''}
							onChange={(event) => updateArticle('subtitle', event.target.value)}
							placeholder="Optional secondary line shown on cards"
							className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
					</label>
					<label className="grid gap-1.5">
						<span className="text-xs text-(--text-secondary)">Excerpt</span>
						<textarea
							value={article.excerpt ?? ''}
							onChange={(event) => updateArticle('excerpt', event.target.value)}
							placeholder="Auto-derived from your first paragraph. Override here if you want."
							rows={3}
							className="resize-none rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
					</label>
					<div className="grid gap-1.5">
						<span className="flex items-baseline justify-between gap-2 text-xs text-(--text-secondary)">
							<span>Topics</span>
							<span className="font-jetbrains text-[10px] text-(--text-tertiary) tabular-nums">
								{(article.tags ?? []).length}/12
							</span>
						</span>
						<input
							value={(article.tags ?? []).join(', ')}
							onChange={(event) =>
								updateArticle(
									'tags',
									event.target.value
										.split(',')
										.map((tag) => tag.trim())
										.filter(Boolean)
								)
							}
							placeholder="stablecoins, lending, ethereum"
							className={`rounded-md border bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) transition-colors placeholder:text-(--text-tertiary) focus:outline-none ${
								publishErrors.tags
									? 'border-red-500/60 focus:border-red-500'
									: 'border-(--form-control-border) focus:border-(--link-text)'
							}`}
						/>
						{(() => {
							const current = new Set((article.tags ?? []).map((t) => t.toLowerCase()))
							const suggestions = (article.entities ?? [])
								.map((e) => e.label || e.slug)
								.filter((label) => label && !current.has(label.toLowerCase()))
								.slice(0, 8)
							if (suggestions.length === 0) return null
							return (
								<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
									<span className="font-jetbrains text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
										From content
									</span>
									{suggestions.map((label) => (
										<button
											key={label}
											type="button"
											onClick={() => {
												const next = Array.from(new Set([...(article.tags ?? []), label]))
												updateArticle('tags', next.slice(0, 12))
											}}
											className="group inline-flex items-center gap-1 rounded-full border border-(--cards-border) bg-(--app-bg) px-2 py-0.5 text-[11px] text-(--text-secondary) transition-colors hover:border-(--link-text)/50 hover:bg-(--link-button) hover:text-(--link-text)"
										>
											<span
												aria-hidden
												className="text-(--text-tertiary) transition-colors group-hover:text-(--link-text)"
											>
												+
											</span>
											{label}
										</button>
									))}
								</div>
							)
						})()}
						<MetaFieldHint error={publishErrors.tags} />
					</div>
				</MetaSection>

				<MetaSection title="Search & social">
					<label className="grid gap-1.5">
						<span className="flex items-baseline justify-between gap-2 text-xs text-(--text-secondary)">
							<span>Meta title</span>
							<span className="font-jetbrains text-[10px] text-(--text-tertiary)">
								{(article.seoTitle ?? '').length}/70
							</span>
						</span>
						<input
							value={article.seoTitle ?? ''}
							onChange={(event) => updateArticle('seoTitle', event.target.value)}
							placeholder={article.title || 'Falls back to article title'}
							maxLength={120}
							className="rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
						<span className="text-[11px] text-(--text-tertiary)">
							Used for the &lt;title&gt; tag. When set, also drives the URL slug if you haven't edited it manually.
						</span>
					</label>
					<label className="grid gap-1.5">
						<span className="flex items-baseline justify-between gap-2 text-xs text-(--text-secondary)">
							<span>Meta description</span>
							<span className="font-jetbrains text-[10px] text-(--text-tertiary)">
								{(article.seoDescription ?? '').length}/160
							</span>
						</span>
						<textarea
							value={article.seoDescription ?? ''}
							onChange={(event) => updateArticle('seoDescription', event.target.value)}
							placeholder="Shown in search results and link previews. Falls back to the excerpt."
							rows={3}
							maxLength={300}
							className="resize-none rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
						/>
					</label>
				</MetaSection>

				<MetaSection title="Authors">
					<div className="grid gap-2">
						{collaboratorsLoading && collaborators.length === 0 ? (
							<div className="text-xs text-(--text-tertiary)">Loading…</div>
						) : null}
						{collaboratorsLoadError ? <div className="text-xs text-red-500">{collaboratorsLoadError}</div> : null}
						{collaborators.map((entry) => (
							<div
								key={entry.pbUserId}
								className="flex items-center justify-between gap-3 rounded-md border border-(--cards-border) bg-(--app-bg) px-3 py-2"
							>
								<div className="flex min-w-0 items-center gap-2">
									{entry.profile.avatarUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={entry.profile.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
									) : (
										<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-(--link-button) text-[11px] font-medium text-(--link-text)">
											{entry.profile.displayName.slice(0, 2).toUpperCase()}
										</span>
									)}
									<div className="min-w-0">
										<div className="truncate text-sm text-(--text-primary)">{entry.profile.displayName}</div>
										<div className="text-[10px] tracking-[0.18em] text-(--text-tertiary) uppercase">
											{entry.role === 'owner' ? 'Owner' : entry.hidden ? 'Co-author · Hidden' : 'Co-author'}
										</div>
									</div>
								</div>
								{isOwner && entry.role === 'collaborator' ? (
									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={() => handleToggleHidden(entry.pbUserId, !entry.hidden)}
											className="text-xs text-(--text-tertiary) transition-colors hover:text-(--link-text)"
											title={entry.hidden ? 'Show in byline' : 'Hide from byline'}
										>
											{entry.hidden ? 'Show' : 'Hide'}
										</button>
										<button
											type="button"
											onClick={() => handleTransferOwnership(entry.pbUserId, entry.profile.displayName)}
											className="text-xs text-(--text-tertiary) transition-colors hover:text-(--link-text)"
											title="Transfer ownership to this co-author"
										>
											Make owner
										</button>
										<button
											type="button"
											onClick={() => handleRemoveCollaborator(entry.pbUserId)}
											className="text-xs text-(--text-tertiary) transition-colors hover:text-red-500"
										>
											Remove
										</button>
									</div>
								) : null}
							</div>
						))}
					</div>
					{isOwner ? (
						<div className="grid gap-1.5">
							<div className="flex gap-2">
								<input
									type="email"
									value={collaboratorEmail}
									onChange={(event) => {
										setCollaboratorEmail(event.target.value)
										if (collaboratorError) setCollaboratorError(null)
									}}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault()
											void handleAddCollaborator()
										}
									}}
									placeholder="Add co-author by email"
									disabled={collaboratorAdding}
									className="flex-1 rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none disabled:opacity-60"
								/>
								<button
									type="button"
									onClick={handleAddCollaborator}
									disabled={collaboratorAdding || !collaboratorEmail.trim()}
									className="rounded-md bg-(--link-text) px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{collaboratorAdding ? 'Adding…' : 'Add'}
								</button>
							</div>
							{collaboratorError ? (
								<span className="text-xs text-red-500">{collaboratorError}</span>
							) : (
								<span className="text-[11px] text-(--text-tertiary)">
									Co-authors can edit, publish, and unpublish. Only you can manage authors or delete.
								</span>
							)}
						</div>
					) : isCollaborator ? (
						<span className="text-[11px] text-(--text-tertiary)">Only the owner can manage authors.</span>
					) : null}
				</MetaSection>
			</div>

			<div className="mt-auto grid gap-2 border-t border-(--cards-border) pt-4">
				{isPublished ? (
					hasPendingEdits ? (
						<button
							type="button"
							disabled={isPublishing || isDiscarding}
							onClick={async () => {
								const ok = await handlePublish()
								if (ok) store.hide()
							}}
							className="flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isPublishing ? 'Publishing…' : 'Publish update'}
						</button>
					) : (
						<button
							type="button"
							disabled={isSaving}
							onClick={async () => {
								await saveArticle()
								store.hide()
							}}
							className="flex h-10 items-center justify-center rounded-md bg-(--link-text) px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSaving ? 'Saving…' : 'Save changes'}
						</button>
					)
				) : (
					<button
						type="button"
						disabled={isPublishing || !article.id}
						onClick={async () => {
							if (isDirty) await saveArticle()
							const ok = await handlePublish()
							if (ok) store.hide()
						}}
						className="flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isPublishing ? 'Publishing…' : 'Publish now'}
					</button>
				)}
				<button
					type="button"
					onClick={() => store.hide()}
					className="text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
				>
					{isPublished ? 'Cancel' : 'Keep editing'}
				</button>
			</div>
		</Ariakit.Dialog>
	)
}
