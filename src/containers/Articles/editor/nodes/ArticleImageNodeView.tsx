import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { normalizeImageHref, type ArticleImageAttrs } from './ArticleImage'

function PhotoIcon({ className = 'h-5 w-5' }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<circle cx="9" cy="9" r="2" />
			<path d="m21 15-4.586-4.586a2 2 0 0 0-2.828 0L3 21" />
		</svg>
	)
}

function ToolbarButton({
	label,
	indicator,
	active,
	tone = 'default',
	onClick,
	title
}: {
	label: string
	indicator?: boolean
	active?: boolean
	tone?: 'default' | 'danger'
	onClick: () => void
	title?: string
}) {
	const baseClass =
		'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed'
	const toneClass =
		tone === 'danger'
			? active
				? 'bg-red-500/10 text-red-500'
				: 'text-(--text-secondary) hover:bg-red-500/10 hover:text-red-500'
			: active
				? 'bg-(--link-button) text-(--link-text)'
				: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
	return (
		<button type="button" title={title ?? label} onClick={onClick} className={`${baseClass} ${toneClass}`}>
			<span>{label}</span>
			{typeof indicator === 'boolean' ? (
				<span
					aria-hidden
					className={`h-1.5 w-1.5 rounded-full transition-colors ${
						indicator ? 'bg-(--link-text)' : 'bg-(--text-tertiary)/40'
					}`}
				/>
			) : null}
		</button>
	)
}

export function ArticleImageNodeView({ node, selected, updateAttributes, deleteNode, editor }: NodeViewProps) {
	const attrs = node.attrs as ArticleImageAttrs
	const [altOpen, setAltOpen] = useState(false)
	const [altDraft, setAltDraft] = useState(attrs.alt ?? '')
	const [linkOpen, setLinkOpen] = useState(false)
	const [linkDraft, setLinkDraft] = useState(attrs.href ?? '')
	const [captionDraft, setCaptionDraft] = useState(attrs.caption ?? '')
	const [captionFocused, setCaptionFocused] = useState(false)
	const [showCaption, setShowCaption] = useState(Boolean(attrs.caption))
	const captionInputRef = useRef<HTMLTextAreaElement | null>(null)
	const linkInputRef = useRef<HTMLInputElement | null>(null)
	const altInputRef = useRef<HTMLTextAreaElement | null>(null)

	useEffect(() => {
		setAltDraft(attrs.alt ?? '')
	}, [attrs.alt])

	useEffect(() => {
		setLinkDraft(attrs.href ?? '')
	}, [attrs.href])

	useEffect(() => {
		setCaptionDraft(attrs.caption ?? '')
		if (attrs.caption) setShowCaption(true)
	}, [attrs.caption])

	useEffect(() => {
		if (linkOpen) setTimeout(() => linkInputRef.current?.focus(), 0)
	}, [linkOpen])

	useEffect(() => {
		if (altOpen) setTimeout(() => altInputRef.current?.focus(), 0)
	}, [altOpen])

	const isEditable = editor?.isEditable !== false
	const isUploading = Boolean(attrs.uploading)
	const showOverlay = isEditable && (selected || altOpen || linkOpen)

	const commitAlt = () => {
		updateAttributes({ alt: altDraft.trim() })
		setAltOpen(false)
	}

	const commitLink = () => {
		updateAttributes({ href: normalizeImageHref(linkDraft) })
		setLinkOpen(false)
	}

	const clearLink = () => {
		setLinkDraft('')
		updateAttributes({ href: '' })
		setLinkOpen(false)
	}

	const toggleCaption = () => {
		if (showCaption) {
			setCaptionDraft('')
			updateAttributes({ caption: '' })
			setShowCaption(false)
			return
		}
		setShowCaption(true)
		setTimeout(() => captionInputRef.current?.focus(), 0)
	}

	const commitCaption = () => {
		const trimmed = captionDraft.trim()
		updateAttributes({ caption: trimmed })
		if (!trimmed) setShowCaption(false)
	}

	return (
		<NodeViewWrapper data-article-image-wrapper className="article-image-block not-prose relative my-6">
			<figure
				className={`relative overflow-hidden rounded-md border bg-(--cards-bg) transition-colors ${
					selected ? 'border-(--link-text)' : 'border-(--cards-border)'
				}`}
			>
				{attrs.src ? (
					<img
						src={attrs.src}
						alt={attrs.alt || ''}
						className="block w-full"
						style={attrs.width && attrs.height ? { aspectRatio: `${attrs.width} / ${attrs.height}` } : undefined}
					/>
				) : (
					<div className="flex aspect-[4/3] w-full items-center justify-center bg-(--app-bg) text-(--text-tertiary)">
						<div className="flex flex-col items-center gap-2">
							<PhotoIcon className="h-7 w-7" />
							<span className="text-xs font-medium">{isUploading ? 'Uploading…' : 'Image'}</span>
						</div>
					</div>
				)}

				{isUploading ? (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 flex items-center justify-center bg-(--app-bg)/40 text-xs font-medium text-(--text-secondary)"
					>
						<span className="rounded-md bg-(--cards-bg)/95 px-3 py-1.5 shadow-sm">Uploading…</span>
					</div>
				) : null}

				{showOverlay && !isUploading ? (
					<div
						contentEditable={false}
						onMouseDown={(e) => e.stopPropagation()}
						className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-md"
					>
						<ToolbarButton
							label="Alt"
							indicator={Boolean(attrs.alt)}
							active={altOpen}
							onClick={() => {
								setAltOpen((v) => !v)
								if (linkOpen) setLinkOpen(false)
							}}
							title={attrs.alt ? `Alt: ${attrs.alt}` : 'Add alt text'}
						/>
						<ToolbarButton
							label="Link"
							indicator={Boolean(attrs.href)}
							active={linkOpen}
							onClick={() => {
								setLinkOpen((v) => !v)
								if (altOpen) setAltOpen(false)
							}}
							title={attrs.href ? `Links to: ${attrs.href}` : 'Add link'}
						/>
						<ToolbarButton
							label="Caption"
							indicator={showCaption}
							active={showCaption}
							onClick={toggleCaption}
							title={showCaption ? 'Remove caption' : 'Add caption'}
						/>
						<span aria-hidden className="mx-0.5 h-4 w-px bg-(--cards-border)" />
						<ToolbarButton label="Remove" tone="danger" onClick={() => deleteNode()} title="Remove image" />
					</div>
				) : null}

				{linkOpen && !isUploading ? (
					<div
						contentEditable={false}
						onMouseDown={(e) => e.stopPropagation()}
						className="absolute top-13 right-3 z-10 grid w-80 gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 shadow-lg"
					>
						<label className="grid gap-1.5">
							<span className="text-xs font-medium text-(--text-secondary)">Image link</span>
							<input
								ref={linkInputRef}
								type="url"
								inputMode="url"
								value={linkDraft}
								onChange={(e) => setLinkDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Escape') {
										e.preventDefault()
										setLinkDraft(attrs.href ?? '')
										setLinkOpen(false)
									}
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault()
										commitLink()
									}
								}}
								placeholder="https://…"
								className="w-full rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
							/>
						</label>
						<div className="flex items-center justify-between">
							{attrs.href ? (
								<button
									type="button"
									onClick={clearLink}
									className="rounded-md px-2 py-1 text-xs text-(--text-tertiary) transition-colors hover:bg-red-500/10 hover:text-red-500"
								>
									Remove link
								</button>
							) : (
								<button
									type="button"
									onClick={() => {
										setLinkDraft(attrs.href ?? '')
										setLinkOpen(false)
									}}
									className="rounded-md px-2 py-1 text-xs text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
								>
									Cancel
								</button>
							)}
							<button
								type="button"
								onClick={commitLink}
								className="rounded-md bg-(--link-button) px-3 py-1.5 text-xs font-medium text-(--link-text) transition-colors hover:brightness-110"
							>
								Save
							</button>
						</div>
					</div>
				) : null}

				{altOpen && !isUploading ? (
					<div
						contentEditable={false}
						onMouseDown={(e) => e.stopPropagation()}
						className="absolute top-13 right-3 z-10 grid w-80 gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 shadow-lg"
					>
						<label className="grid gap-1.5">
							<span className="text-xs font-medium text-(--text-secondary)">Alt text</span>
							<textarea
								ref={altInputRef}
								value={altDraft}
								onChange={(e) => setAltDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Escape') {
										e.preventDefault()
										setAltDraft(attrs.alt ?? '')
										setAltOpen(false)
									}
									if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
										e.preventDefault()
										commitAlt()
									}
								}}
								rows={3}
								placeholder="Describe the image for screen readers"
								className="w-full resize-none rounded-md border border-(--form-control-border) bg-(--app-bg) px-3 py-2 text-sm leading-snug text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
							/>
						</label>
						<div className="flex items-center justify-between">
							<button
								type="button"
								onClick={() => {
									setAltDraft(attrs.alt ?? '')
									setAltOpen(false)
								}}
								className="rounded-md px-2 py-1 text-xs text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={commitAlt}
								className="rounded-md bg-(--link-button) px-3 py-1.5 text-xs font-medium text-(--link-text) transition-colors hover:brightness-110"
							>
								Save
							</button>
						</div>
					</div>
				) : null}
			</figure>

			{showCaption ? (
				<div className="mt-2">
					<textarea
						ref={captionInputRef}
						value={captionDraft}
						onChange={(e) => setCaptionDraft(e.target.value)}
						onFocus={() => setCaptionFocused(true)}
						onBlur={() => {
							setCaptionFocused(false)
							commitCaption()
						}}
						placeholder="Add a caption…"
						rows={Math.min(3, Math.max(1, captionDraft.split('\n').length))}
						className={`w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm leading-snug text-(--text-secondary) transition-colors outline-none ${
							captionFocused ? 'border-(--link-text)' : 'border-(--cards-border)'
						}`}
					/>
				</div>
			) : null}
		</NodeViewWrapper>
	)
}
