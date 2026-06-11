import type { CSSProperties } from 'react'

export function avatarColorStyle(seed: string): CSSProperties {
	let hash = 5381
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 33) ^ seed.charCodeAt(i)
	}
	const hue = Math.abs(hash) % 360
	return {
		backgroundColor: `hsl(${hue} 48% 38%)`,
		color: '#fff'
	}
}
