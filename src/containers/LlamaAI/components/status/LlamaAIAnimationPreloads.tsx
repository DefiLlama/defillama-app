import Head from 'next/head'
import { useEffect } from 'react'

export const LLAMA_AI_ANIMATION_SRC = '/assets/llamaai/llamaai_animation.webp'
export const LLAMA_AI_HACKER_ANIMATION_SRC = '/assets/llamaai/hackerllama.webp'

const LLAMA_AI_ANIMATION_ASSETS = [LLAMA_AI_ANIMATION_SRC, LLAMA_AI_HACKER_ANIMATION_SRC] as const

function warmImageCache(src: string) {
	const image = new window.Image()
	image.decoding = 'async'
	image.src = src
}

export function LlamaAIAnimationPreloads() {
	useEffect(() => {
		for (const src of LLAMA_AI_ANIMATION_ASSETS) {
			warmImageCache(src)
		}
	}, [])

	return (
		<Head>
			<link rel="preload" as="image" type="image/webp" href={LLAMA_AI_ANIMATION_SRC} />
			<link rel="preload" as="image" type="image/webp" href={LLAMA_AI_HACKER_ANIMATION_SRC} />
		</Head>
	)
}
