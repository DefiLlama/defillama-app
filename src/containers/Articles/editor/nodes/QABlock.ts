import { mergeAttributes, Node } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

function createQAPairNode(type: string) {
	return {
		type,
		content: [
			{ type: 'qaQuestion', content: [] },
			{ type: 'qaAnswer', content: [{ type: 'paragraph' }] }
		]
	}
}

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
				({ chain, tr: currentTr }) => {
					const $from = currentTr.selection.$from
					let enclosingQADepth: number | null = null
					for (let depth = 1; depth <= $from.depth; depth++) {
						if ($from.node(depth).type.name === this.name) {
							enclosingQADepth = depth
							break
						}
					}

					const pair = createQAPairNode(this.name)
					const insertPos = enclosingQADepth === null ? null : $from.after(enclosingQADepth)
					const command = insertPos === null ? chain().insertContent(pair) : chain().insertContentAt(insertPos, pair)

					return command
						.command(({ tr: nextTr, dispatch }) => {
							if (!dispatch) return true
							if (insertPos !== null) {
								nextTr.setSelection(TextSelection.near(nextTr.doc.resolve(insertPos + 2)))
								return true
							}
							const $selectionFrom = nextTr.selection.$from
							for (let depth = $selectionFrom.depth; depth >= 0; depth--) {
								if ($selectionFrom.node(depth).type.name !== this.name) continue
								const qaStart = $selectionFrom.before(depth)
								const questionInside = qaStart + 2
								nextTr.setSelection(TextSelection.near(nextTr.doc.resolve(questionInside)))
								return true
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
