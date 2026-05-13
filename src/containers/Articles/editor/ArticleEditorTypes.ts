import type { LocalArticleDocument } from '../types'

export type ArticleFieldUpdater = <K extends keyof LocalArticleDocument>(key: K, value: LocalArticleDocument[K]) => void

export type SavePillState = 'saving' | 'saved' | 'unsaved' | 'error' | 'idle'
