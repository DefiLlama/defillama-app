import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ArticlePeoplePanelBlock } from '../../renderer/ArticlePeoplePanelBlock'
import { validateArticlePeoplePanel, type ArticlePeoplePanelConfig } from '../peoplePanel'

export function ArticlePeoplePanelNodeView({ node, selected, deleteNode, getPos, editor }: NodeViewProps) {
	const config = validateArticlePeoplePanel(node.attrs.config) ?? null
	const isEditable = editor?.isEditable !== false

	const handleEdit = () => {
		if (typeof getPos !== 'function') return
		const pos = getPos()
		if (typeof pos !== 'number') return
		const detail: { pos: number; config: ArticlePeoplePanelConfig | null } = { pos, config }
		document.dispatchEvent(new CustomEvent('article:edit-people-panel', { detail }))
	}

	return (
		<NodeViewWrapper
			data-people-panel-wrapper
			className={`not-prose relative my-6 rounded-md border bg-(--cards-bg) p-5 transition-colors ${
				selected ? 'border-(--link-text)' : 'border-(--cards-border)'
			}`}
		>
			{config ? (
				<ArticlePeoplePanelBlock config={config} compact />
			) : (
				<button
					type="button"
					onClick={handleEdit}
					className="w-full rounded-md py-6 text-center text-sm text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
				>
					Empty people panel — click to configure
				</button>
			)}

			{isEditable && selected ? (
				<div
					contentEditable={false}
					onMouseDown={(e) => e.stopPropagation()}
					className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 shadow-md"
				>
					<button
						type="button"
						onClick={handleEdit}
						className="rounded-md px-2 py-1 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => deleteNode()}
						className="rounded-md px-2 py-1 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-red-500/10 hover:text-red-500"
					>
						Remove
					</button>
				</div>
			) : null}
		</NodeViewWrapper>
	)
}
