import { useState, type RefObject } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { downloadDataURL } from '~/utils'

interface KeyMetricsPngExportButtonProps {
	containerRef: RefObject<HTMLDivElement | null>
	protocolName: string
	primaryValue?: number
	primaryLabel: string
	formatPrice: (value: number | string | null) => string | number | null
	hasTvlData?: boolean
}

interface MetricRow {
	label: string
	value: string
}

function getTrimmedText(el: Element | null | undefined): string {
	return el?.textContent?.trim().replace(/\s+/g, ' ') ?? ''
}

function extractLabel(el: HTMLElement): string {
	const directChildren = Array.from(el.children) as HTMLElement[]
	const directLabel =
		directChildren.find((child) => child.matches?.('[class*="text-(--text-label)"]')) ??
		directChildren.find((child) => child.tagName.toUpperCase() === 'SPAN')
	const fallbackLabel = el.querySelector?.('[class*="text-(--text-label)"]') ?? null

	return getTrimmedText(directLabel ?? fallbackLabel)
}

function extractValue(el: HTMLElement): string {
	const valueEl = el.querySelector?.('.font-jetbrains') ?? null
	return getTrimmedText(valueEl)
}

function extractRow(el: HTMLElement): MetricRow | null {
	const label = extractLabel(el)
	const value = extractValue(el)
	if (!label || !value) return null
	return { label, value }
}

function extractRows(container: HTMLDivElement): MetricRow[] {
	const rows: MetricRow[] = []
	const children = Array.from(container.children)

	for (const child of children) {
		const el = child as HTMLElement
		const tagName = el.tagName.toUpperCase()

		if (tagName === 'P') {
			const row = extractRow(el)
			if (row) rows.push(row)
		} else if (tagName === 'DETAILS') {
			const summary = el.querySelector('summary')
			if (summary) {
				const row = extractRow(summary as unknown as HTMLElement)
				if (row) rows.push(row)
			}
		}
	}

	return rows
}

async function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = src
	})
}

async function loadProtocolIcon(name: string): Promise<string | null> {
	try {
		const response = await fetch(`/api/protocol-icon?slug=${encodeURIComponent(name)}`)
		if (!response.ok) return null
		const blob = await response.blob()
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	} catch {
		return null
	}
}

function drawCircularImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) {
	ctx.save()
	ctx.beginPath()
	ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
	ctx.closePath()
	ctx.clip()
	ctx.drawImage(img, x, y, size, size)
	ctx.restore()
}

function fillRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
) {
	ctx.beginPath()
	const roundRectCtx = ctx as CanvasRenderingContext2D & {
		roundRect?: (x: number, y: number, width: number, height: number, radius: number) => void
	}
	if (typeof roundRectCtx.roundRect === 'function') {
		roundRectCtx.roundRect(x, y, width, height, radius)
	} else {
		const r = Math.min(radius, width / 2, height / 2)
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + width - r, y)
		ctx.quadraticCurveTo(x + width, y, x + width, y + r)
		ctx.lineTo(x + width, y + height - r)
		ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
		ctx.lineTo(x + r, y + height)
		ctx.quadraticCurveTo(x, y + height, x, y + height - r)
		ctx.lineTo(x, y + r)
		ctx.quadraticCurveTo(x, y, x + r, y)
	}
	ctx.closePath()
	ctx.fill()
}

export function KeyMetricsPngExportButton({
	containerRef,
	protocolName,
	primaryValue,
	primaryLabel,
	formatPrice,
	hasTvlData = false
}: KeyMetricsPngExportButtonProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [isDark] = useDarkModeManager()

	const handleExport = async () => {
		if (isLoading || !containerRef.current) return

		setIsLoading(true)

		const bgColor = isDark ? '#0b1214' : '#ffffff'
		const textColor = isDark ? '#ffffff' : '#000000'
		const labelColor = isDark ? '#d1d1d1' : '#666666'
		const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
		const watermarkSrc = isDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp'

		try {
			const hasPrimaryValue = hasTvlData && primaryValue != null
			const formattedPrimaryValue = hasPrimaryValue ? String(formatPrice(primaryValue) ?? '') : ''
			const dpr = window.devicePixelRatio || 1
			const primaryValueHeight = hasPrimaryValue ? 72 : 0
			const container = containerRef.current
			const rows = extractRows(container)

			if (!hasPrimaryValue) {
				if (rows.length === 0) {
					return
				}
			}

			const containerWidth = container.getBoundingClientRect().width
			const canvasWidth = Math.max(400, Math.min(600, containerWidth))

			const padding = 24
			const headerHeight = 56
			const rowHeight = 32
			const rowsHeight = rows.length * rowHeight
			const canvasHeight = padding * 2 + headerHeight + primaryValueHeight + rowsHeight

			const canvas = document.createElement('canvas')
			canvas.width = canvasWidth * dpr
			canvas.height = canvasHeight * dpr
			const ctx = canvas.getContext('2d')
			if (!ctx) {
				return
			}

			ctx.scale(dpr, dpr)

			ctx.fillStyle = bgColor
			fillRoundedRect(ctx, 0, 0, canvasWidth, canvasHeight, 12)

			const iconBase64 = await loadProtocolIcon(protocolName)
			let iconImg: HTMLImageElement | null = null
			if (iconBase64) {
				try {
					iconImg = await loadImage(iconBase64)
				} catch {}
			}

			let headerX = padding
			const headerY = padding
			const iconSize = 40

			if (iconImg) {
				drawCircularImage(ctx, iconImg, headerX, headerY, iconSize)
				headerX += iconSize + 12
			}

			ctx.fillStyle = textColor
			ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
			ctx.textBaseline = 'middle'
			ctx.fillText(protocolName, headerX, headerY + iconSize / 2)

			let rowsStartY = headerY + headerHeight

			if (hasPrimaryValue) {
				const primaryY = headerY + headerHeight
				ctx.fillStyle = labelColor
				ctx.font = '14px system-ui, -apple-system, sans-serif'
				ctx.textAlign = 'left'
				ctx.textBaseline = 'top'
				ctx.fillText(primaryLabel, padding, primaryY)

				ctx.fillStyle = textColor
				ctx.font = 'bold 32px "JetBrains Mono", monospace'
				ctx.fillText(formattedPrimaryValue, padding, primaryY + 22)

				rowsStartY = primaryY + primaryValueHeight
			}

			ctx.font = '14px system-ui, -apple-system, sans-serif'

			for (let index = 0; index < rows.length; index++) {
				const row = rows[index]
				const rowY = rowsStartY + index * rowHeight

				ctx.strokeStyle = borderColor
				ctx.lineWidth = 1
				ctx.beginPath()
				ctx.moveTo(padding, rowY)
				ctx.lineTo(canvasWidth - padding, rowY)
				ctx.stroke()

				ctx.fillStyle = labelColor
				ctx.textBaseline = 'middle'
				ctx.textAlign = 'left'
				ctx.fillText(row.label, padding, rowY + rowHeight / 2)

				ctx.fillStyle = textColor
				ctx.textAlign = 'right'
				ctx.font = '14px "JetBrains Mono", monospace'
				ctx.fillText(row.value, canvasWidth - padding, rowY + rowHeight / 2)

				ctx.font = '14px system-ui, -apple-system, sans-serif'
			}

			try {
				const watermarkImg = await loadImage(watermarkSrc)
				const wmHeight = 48
				const wmWidth = (watermarkImg.width / watermarkImg.height) * wmHeight
				const wmX = (canvasWidth - wmWidth) / 2
				const wmY = (canvasHeight - wmHeight) / 2

				ctx.globalAlpha = 0.6
				ctx.drawImage(watermarkImg, wmX, wmY, wmWidth, wmHeight)
				ctx.globalAlpha = 1
			} catch {}

			const dataUrl = canvas.toDataURL('image/png')
			const filename = `${protocolName.toLowerCase().replace(/\s+/g, '-')}-key-metrics.png`
			downloadDataURL(filename, dataUrl)
		} catch (error) {
			console.log('Error exporting key metrics:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<button
			onClick={handleExport}
			disabled={isLoading}
			className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:opacity-60"
			title="Download Key Metrics as PNG"
		>
			{isLoading ? <LoadingSpinner size={12} /> : <Icon name="download-paper" height={12} width={12} />}
			<span>.png</span>
		</button>
	)
}
