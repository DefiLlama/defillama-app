import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { validateArticlePeoplePanel, type ArticlePeoplePanelConfig } from '../peoplePanel'
import { ArticlePeoplePanelNodeView } from './ArticlePeoplePanelNodeView'

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		articlePeoplePanel: {
			insertPeoplePanel: (config: ArticlePeoplePanelConfig) => ReturnType
			updatePeoplePanel: (args: { pos: number; config: ArticlePeoplePanelConfig }) => ReturnType
		}
	}
}

export const ArticlePeoplePanel = Node.create({
	name: 'articlePeoplePanel',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			config: {
				default: null,
				parseHTML: (el) => {
					const raw = el.getAttribute('data-config')
					if (!raw) return null
					try {
						return validateArticlePeoplePanel(JSON.parse(raw))
					} catch {
						return null
					}
				},
				renderHTML: (attrs) => {
					const config = attrs.config as ArticlePeoplePanelConfig | null
					if (!config) return {}
					return { 'data-config': JSON.stringify(config) }
				}
			}
		}
	},

	parseHTML() {
		return [{ tag: 'figure[data-people-panel]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return ['figure', mergeAttributes(HTMLAttributes, { 'data-people-panel': 'true' })]
	},

	addNodeView() {
		return ReactNodeViewRenderer(ArticlePeoplePanelNodeView)
	},

	addCommands() {
		return {
			insertPeoplePanel:
				(config) =>
				({ commands }) =>
					commands.insertContent({ type: this.name, attrs: { config } }),
			updatePeoplePanel:
				({ pos, config }) =>
				({ tr, state, dispatch }) => {
					const node = state.doc.nodeAt(pos)
					if (!node || node.type.name !== 'articlePeoplePanel') return false
					if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, config })
					return true
				}
		}
	}
})
