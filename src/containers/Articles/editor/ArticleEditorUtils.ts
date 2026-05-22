import { useEffect, useState } from 'react'

const SAFE_LINK_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function sanitizeLinkHref(raw: string): string | null {
	const value = raw.trim()
	if (!value) return null
	if (value.startsWith('#') || value.startsWith('/') || value.startsWith('?')) return value
	const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*):/i)
	if (schemeMatch) {
		const scheme = (schemeMatch[1] + ':').toLowerCase()
		return SAFE_LINK_SCHEMES.has(scheme) ? value : null
	}
	return `https://${value}`
}

export function slugFromTitle(title: string) {
	return (
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 120) || 'untitled'
	)
}

export function toDateTimeLocal(iso: string | null | undefined): string {
	if (!iso) return ''
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ''
	const pad = (n: number) => n.toString().padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocal(value: string): string | null {
	if (!value) return null
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function formatArticleDate(iso: string | null | undefined): string {
	if (!iso) return ''
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ''
	return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatRelative(iso: string | null | undefined) {
	if (!iso) return null
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return null
	const diff = Date.now() - date.getTime()
	if (diff < 5_000) return 'just now'
	if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function useTicker(intervalMs = 30_000) {
	const [, set] = useState(0)
	useEffect(() => {
		const id = setInterval(() => set((c) => c + 1), intervalMs)
		return () => clearInterval(id)
	}, [intervalMs])
}

export function articleQueryKey(articleId: string | undefined) {
	return ['research', 'owned-article', articleId] as const
}
