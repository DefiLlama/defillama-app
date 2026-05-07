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
			className={`not-prose relative my-6 border bg-(--cards-bg) p-5 transition-colors ${
				selected ? 'border-(--link-text)' : 'border-(--cards-border)'
			}`}
		>
			{config ? (
				<ArticlePeoplePanelBlock config={config} compact />
			) : (
				<button
					type="button"
					onClick={handleEdit}
					className="font-jetbrains w-full py-6 text-center text-[11px] tracking-[0.18em] text-(--text-tertiary) uppercase hover:text-(--text-primary)"
				>
					Empty people panel — click to configure
				</button>
			)}

			{isEditable && selected ? (
				<div
					contentEditable={false}
					onMouseDown={(e) => e.stopPropagation()}
					className="font-jetbrains absolute top-3 right-3 flex items-stretch divide-x divide-(--cards-border) border border-(--cards-border) bg-(--cards-bg)/95 text-[10px] tracking-[0.18em] uppercase backdrop-blur-sm"
				>
					<button
						type="button"
						onClick={handleEdit}
						className="px-2.5 py-1.5 text-(--text-tertiary) transition-colors hover:bg-(--app-bg) hover:text-(--text-primary)"
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => deleteNode()}
						className="px-2.5 py-1.5 text-(--text-tertiary) transition-colors hover:bg-red-500/10 hover:text-red-500"
					>
						Remove
					</button>
				</div>
			) : null}
		</NodeViewWrapper>
	)
}
