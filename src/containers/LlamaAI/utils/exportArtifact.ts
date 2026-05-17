/**
 * Orchestrator for exporting a LlamaAI message as a standalone HTML artifact.
 *
 * Walks the message's chart artifacts, invokes the existing PNG export
 * pipeline (reused via `exportChartAsPng`) for each one, fetches the
 * DefiLlama wordmark, and calls the editorial template renderer.
 *
 * Returns the HTML string, a blob URL for preview/download, and a suggested
 * filename. Caller is responsible for revoking the blob URL when done.
 */

import { exportChartAsPng } from '~/components/ButtonStyled/chartPngExport'
import { renderEditorialReport, type ChartImage } from '~/containers/LlamaAI/templates/editorial'
import type { Message } from '~/containers/LlamaAI/types'
import type { ChartInstanceRegistry } from '~/containers/LlamaAI/utils/chartInstanceRegistry'

export interface ExportArtifactInput {
	message: Message
	chartInstances: ChartInstanceRegistry
	/** Whether the user is in dark mode — passes through to chart PNG export for background coloring. */
	isDark: boolean
	/** Optional override of generation timestamp. Defaults to now. */
	generatedAt?: Date
}

export interface ExportedArtifact {
	html: string
	blobUrl: string
	filename: string
}

const DEFILLAMA_WORDMARK_URL = '/assets/defillama-research.svg'

async function fetchAsDataUrl(url: string): Promise<string | undefined> {
	try {
		const response = await fetch(url)
		if (!response.ok) return undefined
		const blob = await response.blob()
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				if (typeof reader.result === 'string') resolve(reader.result)
				else reject(new Error('Failed to read asset'))
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	} catch {
		return undefined
	}
}

// Cache the wordmark for the session. The SVG doesn't change during a tab's
// lifetime, and the FileReader→data-URL conversion is non-trivial for a
// kilobytes-size asset. On failure we clear the cache so the next export retries
// instead of permanently serving the text-only "Powered by DefiLlama" fallback.
let cachedWordmarkPromise: Promise<string | undefined> | null = null
function getDefillamaWordmarkDataUrl(): Promise<string | undefined> {
	if (!cachedWordmarkPromise) {
		cachedWordmarkPromise = fetchAsDataUrl(DEFILLAMA_WORDMARK_URL).then((value) => {
			if (value === undefined) cachedWordmarkPromise = null
			return value
		})
	}
	return cachedWordmarkPromise
}

async function buildChartImages(
	message: Message,
	chartInstances: ChartInstanceRegistry,
	isDark: boolean
): Promise<Map<string, ChartImage>> {
	const images = new Map<string, ChartImage>()
	const chartConfigs = (message.charts ?? []).flatMap((set) => set.charts ?? [])
	if (chartConfigs.length === 0) return images

	// Each export is CPU-bound on the main thread (ECharts paint + canvas
	// rasterize). Parallelizing yields no wall-clock speedup and would N-fold
	// transient canvas memory. The yield between exports lets the browser paint
	// the loading toast and handle scroll/click during a multi-chart export.
	for (let i = 0; i < chartConfigs.length; i++) {
		const chart = chartConfigs[i]
		const getter = chartInstances.get(chart.id)
		const instance = getter ? getter() : null
		if (!instance) continue
		const title = typeof chart.title === 'string' ? chart.title : undefined
		try {
			const dataUrl = await exportChartAsPng(instance, { isDark, title })
			if (dataUrl) images.set(chart.id, { dataUrl, title })
		} catch (error) {
			console.warn(`Failed to export chart ${chart.id}:`, error)
		}
		if (i < chartConfigs.length - 1) {
			await new Promise<void>((resolve) => setTimeout(resolve, 0))
		}
	}

	return images
}

/**
 * Generate a standalone HTML artifact for a LlamaAI research-mode message.
 * Returns the rendered HTML, a blob URL for preview/download, and a suggested
 * filename.
 *
 * The caller owns the blob URL and must call URL.revokeObjectURL() when done
 * with it.
 */
export async function exportMessageAsHtml(input: ExportArtifactInput): Promise<ExportedArtifact> {
	const generatedAt = input.generatedAt ?? new Date()
	const [chartImages, defillamaWordmarkDataUrl] = await Promise.all([
		buildChartImages(input.message, input.chartInstances, input.isDark),
		getDefillamaWordmarkDataUrl()
	])

	const html = await renderEditorialReport({
		message: input.message,
		chartImages,
		defillamaWordmarkDataUrl,
		generatedAt
	})

	const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
	const blobUrl = URL.createObjectURL(blob)
	const filename = `defillama-research-${generatedAt.toISOString().split('T')[0]}.html`

	return { html, blobUrl, filename }
}
