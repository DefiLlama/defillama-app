import { mergeAttributes, Node } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		qaBlock: {
			insertQAPair: () => ReturnType
		}
	}
}

export const QAQuestion = Node.create({
	name: 'qaQuestion',
	content: 'inline*',
	defining: true,
	isolating: true,
	selectable: false,

	parseHTML() {
		return [{ tag: 'dt[data-article-qa-question]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'dt',
			mergeAttributes(HTMLAttributes, {
				'data-article-qa-question': 'true',
				class: 'article-qa-question'
			}),
			0
		]
	}
})

export const QAAnswer = Node.create({
	name: 'qaAnswer',
	content: 'block+',
	defining: true,
	isolating: true,
	selectable: false,

	parseHTML() {
		return [{ tag: 'dd[data-article-qa-answer]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'dd',
			mergeAttributes(HTMLAttributes, {
				'data-article-qa-answer': 'true',
				class: 'article-qa-answer'
			}),
			0
		]
	}
})

export const QABlock = Node.create({
	name: 'qa',
	group: 'block',
	content: 'qaQuestion qaAnswer',
	defining: true,
	draggable: true,
	selectable: true,

	parseHTML() {
		return [{ tag: 'dl[data-article-qa]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'dl',
			mergeAttributes(HTMLAttributes, {
				'data-article-qa': 'true',
				class: 'article-qa'
			}),
			0
		]
	},

	addCommands() {
		return {
			insertQAPair:
				() =>
				({ chain }) => {
					return chain()
						.insertContent({
							type: this.name,
							content: [
								{ type: 'qaQuestion', content: [] },
								{ type: 'qaAnswer', content: [{ type: 'paragraph' }] }
							]
						})
						.command(({ tr, dispatch }) => {
							if (!dispatch) return true
							const $from = tr.selection.$from
							for (let depth = $from.depth; depth >= 0; depth--) {
								if ($from.node(depth).type.name === 'qa') {
									const qaStart = $from.before(depth)
									const questionInside = qaStart + 2
									tr.setSelection(TextSelection.near(tr.doc.resolve(questionInside)))
									return true
								}
							}
							return true
						})
						.scrollIntoView()
						.run()
				}
		}
	}
})

export const QABlockNodes = [QAQuestion, QAAnswer, QABlock]
