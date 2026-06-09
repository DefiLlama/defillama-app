import type { CSSProperties, ReactNode } from 'react'

const AUTHOR_BG = '/assets/research/author-bg'

/** Desktop artboard (`36:409` / `47:651`). */
const DESKTOP_FRAME = {
	width: 1510,
	height: 1591
} as const

/** Mobile artboard (`55:458` / `56:776`). */
const MOBILE_FRAME = {
	width: 390,
	height: 1384
} as const

/**
 * Figma inner image size inside each `blue` ellipse layer (`47:652`–`47:654`).
 * Glow is this % of the layer frame — not a separate oversized circle.
 */
const FIGMA_LAYER_GLOW = {
	widthPct: 67.65,
	heightPct: 94.76
} as const

const FIGMA = {
	desktop: {
		dark: {
			clipPx: 532,
			layerWidth: 1510,
			layerOffsetX: 0,
			layerOffsetY: -5,
			src: `${AUTHOR_BG}/header-bg-dark-desktop.webp`
		},
		light: {
			clipPx: 610,
			layerWidth: 1510,
			layerOffsetX: 0,
			layerOffsetY: -40,
			src: `${AUTHOR_BG}/header-bg-light-desktop.webp`
		}
	},
	mobile: {
		dark: {
			clipPx: 621,
			src: `${AUTHOR_BG}/header-bg-dark-mobile.webp`
		}
	}
} as const

type FigmaGlowLayer = {
	/** Layer origin + size in artboard px (can extend off-screen). */
	x: number
	y: number
	w: number
	h: number
	/** Gradient center inside the layer box. */
	anchor: { x: string; y: string }
	/** Blur radius at design artboard width (scales with vw). */
	blurPx: number
	/** Override default 67.65×94.76% fill (mobile pill uses smaller visible core). */
	glowFill?: { widthPct: number; heightPct: number }
	stops: string
	opacity?: number
}

const DARK_BLOB_STOPS =
	'rgba(35, 123, 255, 0.55) 0%, rgba(28, 95, 210, 0.22) 38%, rgba(12, 45, 120, 0.06) 55%, transparent 62%'

const LIGHT_BLOB_STOPS =
	'rgba(35, 123, 255, 0.48) 0%, rgba(80, 145, 255, 0.28) 36%, rgba(140, 185, 255, 0.1) 52%, transparent 62%'

/**
 * Desktop `blue` layers — `36:409` / `47:651`.
 *
 * | Blob        | x     | y   | w    | h   | % frame          |
 * |-------------|-------|-----|------|-----|------------------|
 * | top-right   | 1059  | 137 | 1091 | 712 | 70%→, 9%↓        |
 * | bottom-left | -683  | 849 | 1191 | 774 | off←, 53%↓       |
 * | top-left    | -583  | -318| 1091 | 712 | off←, off↑       |
 */
const DESKTOP_GLOWS = {
	dark: {
		topRight: {
			x: 1059,
			y: 137,
			w: 1091,
			h: 712,
			anchor: { x: '14%', y: '52%' },
			blurPx: 28,
			stops: DARK_BLOB_STOPS
		},
		bottomLeft: {
			x: -683,
			y: 849,
			w: 1191,
			h: 774,
			anchor: { x: '74%', y: '16%' },
			blurPx: 32,
			stops: DARK_BLOB_STOPS
		},
		topLeft: {
			x: -583,
			y: -318,
			w: 1091,
			h: 712,
			anchor: { x: '70%', y: '88%' },
			blurPx: 28,
			stops: DARK_BLOB_STOPS
		}
	},
	light: {
		topRight: {
			x: 1103,
			y: 172,
			w: 1091,
			h: 712,
			anchor: { x: '14%', y: '52%' },
			blurPx: 28,
			opacity: 0.75,
			stops: LIGHT_BLOB_STOPS
		},
		bottomLeft: {
			x: -683,
			y: 849,
			w: 1191,
			h: 774,
			anchor: { x: '74%', y: '16%' },
			blurPx: 32,
			opacity: 0.75,
			stops: LIGHT_BLOB_STOPS
		},
		topLeft: {
			x: -710,
			y: -281,
			w: 1091,
			h: 712,
			anchor: { x: '70%', y: '88%' },
			blurPx: 28,
			opacity: 0.75,
			stops: LIGHT_BLOB_STOPS
		}
	}
} as const satisfies Record<string, Record<string, FigmaGlowLayer>>

const INTERMEDIATE_CLIP = 'clamp(580px, 78vh, 760px)'

/**
 * Mobile `Pill bg` — `55:467` / `56:782`.
 * CSS glow matching the Figma ellipse (raster + screen-blend failed on `#1D1D1D`).
 */
const MOBILE_ARTICLE_GLOW = {
	dark: {
		x: -444,
		y: 0,
		w: 859,
		h: 620,
		anchor: { x: '76%', y: '22%' },
		blurPx: 44,
		glowFill: { widthPct: 58, heightPct: 72 },
		stops: DARK_BLOB_STOPS,
		opacity: 0.75
	},
	light: {
		x: -444,
		y: 0,
		w: 859,
		h: 620,
		anchor: { x: '76%', y: '22%' },
		blurPx: 44,
		glowFill: { widthPct: 58, heightPct: 72 },
		stops: LIGHT_BLOB_STOPS,
		opacity: 0.75
	}
} as const satisfies Record<string, FigmaGlowLayer>

/** Figma: pill y=859, article list y=627 → 232px below article header. */
const MOBILE_ARTICLE_GLOW_TOP = `calc(${INTERMEDIATE_CLIP} + min(${(232 / MOBILE_FRAME.width) * 100}vw, 232px))`

type DesktopLayer = {
	clipPx: number
	layerWidth: number
	layerOffsetX: number
	layerOffsetY: number
	src: string
}

/** Scale artboard px → vw (caps at design px above artboard width). */
function artboardScale(px: number, frameWidth: number) {
	return `min(${(px / frameWidth) * 100}vw, ${px}px)`
}

function artboardSceneHeight(frame: { width: number; height: number }) {
	return `min(${(frame.height / frame.width) * 100}vw, ${frame.height}px)`
}

function desktopClipHeight(clipPx: number) {
	return artboardScale(clipPx, DESKTOP_FRAME.width)
}

const DESKTOP_SCENE_HEIGHT = artboardSceneHeight(DESKTOP_FRAME)

const HEADER_BOTTOM_FADE =
	'[mask-image:linear-gradient(to_bottom,#000_0%,#000_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_88%,transparent_100%)]'

function figmaLayerOffset(offsetPx: number, basePx: number) {
	return `min(${(offsetPx / basePx) * 100}%, ${offsetPx}px)`
}

function FigmaGlow({
	layer,
	frameWidth,
	lightStops
}: {
	layer: FigmaGlowLayer
	frameWidth: number
	lightStops?: boolean
}) {
	const fill = layer.glowFill ?? FIGMA_LAYER_GLOW
	const stops = lightStops ? LIGHT_BLOB_STOPS : layer.stops

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute overflow-visible"
			style={{
				left: artboardScale(layer.x, frameWidth),
				top: artboardScale(layer.y, frameWidth),
				width: artboardScale(layer.w, frameWidth),
				height: artboardScale(layer.h, frameWidth),
				opacity: layer.opacity ?? 1
			}}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute rounded-full"
				style={{
					left: layer.anchor.x,
					top: layer.anchor.y,
					width: `${fill.widthPct}%`,
					height: `${fill.heightPct}%`,
					transform: 'translate(-50%, -50%)',
					background: `radial-gradient(ellipse 100% 100% at center, ${stops})`,
					filter: `blur(${artboardScale(layer.blurPx, frameWidth)})`
				}}
			/>
		</div>
	)
}

function DesktopHeaderImage({ layer, clipHeight }: { layer: DesktopLayer; clipHeight: string }) {
	const { clipPx, layerWidth, layerOffsetX, layerOffsetY, src } = layer

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
			style={{ height: clipHeight }}
		>
			<img
				src={src}
				alt=""
				aria-hidden
				className="absolute max-w-none object-cover object-left-top select-none"
				style={
					{
						left: figmaLayerOffset(layerOffsetX, DESKTOP_FRAME.width),
						top: figmaLayerOffset(layerOffsetY, clipPx),
						width: artboardScale(layerWidth, DESKTOP_FRAME.width),
						height: clipHeight,
						objectPosition: 'left top'
					} as CSSProperties
				}
			/>
		</div>
	)
}

function DesktopSceneShell({ className, children }: { className: string; children: ReactNode }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 top-0 mx-auto w-full max-w-[1510px] overflow-visible ${className}`}
			style={{ height: DESKTOP_SCENE_HEIGHT }}
		>
			{children}
		</div>
	)
}

function DesktopDarkBackground({ className }: { className: string }) {
	const { topRight, bottomLeft, topLeft } = DESKTOP_GLOWS.dark
	const clipHeight = desktopClipHeight(FIGMA.desktop.dark.clipPx)

	return (
		<DesktopSceneShell className={className}>
			<FigmaGlow layer={topRight} frameWidth={DESKTOP_FRAME.width} />
			<DesktopHeaderImage layer={FIGMA.desktop.dark} clipHeight={clipHeight} />
			<FigmaGlow layer={bottomLeft} frameWidth={DESKTOP_FRAME.width} />
			<FigmaGlow layer={topLeft} frameWidth={DESKTOP_FRAME.width} />
		</DesktopSceneShell>
	)
}

function DesktopLightBackground({ className }: { className: string }) {
	const { topRight, bottomLeft, topLeft } = DESKTOP_GLOWS.light
	const clipHeight = desktopClipHeight(FIGMA.desktop.light.clipPx)

	return (
		<DesktopSceneShell className={className}>
			<FigmaGlow layer={topRight} frameWidth={DESKTOP_FRAME.width} lightStops />
			<DesktopHeaderImage layer={FIGMA.desktop.light} clipHeight={clipHeight} />
			<FigmaGlow layer={bottomLeft} frameWidth={DESKTOP_FRAME.width} lightStops />
			<FigmaGlow layer={topLeft} frameWidth={DESKTOP_FRAME.width} lightStops />
		</DesktopSceneShell>
	)
}

function FullBleedHeaderImage({
	src,
	clipHeight,
	objectPosition = 'center top',
	layerOffsetY = 0,
	fadeBottom = false
}: {
	src: string
	clipHeight: string
	objectPosition?: string
	layerOffsetY?: number
	fadeBottom?: boolean
}) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 top-0 w-full overflow-hidden ${fadeBottom ? HEADER_BOTTOM_FADE : ''}`}
			style={{ height: clipHeight }}
		>
			<img
				src={src}
				alt=""
				aria-hidden
				className="absolute top-0 left-0 h-full w-full max-w-none object-cover select-none"
				style={{
					top: layerOffsetY ? figmaLayerOffset(layerOffsetY, 610) : 0,
					objectPosition
				}}
			/>
		</div>
	)
}

/** Bottom-left article glow — sits under list content without extending page scroll. */
function MobileArticleGlow({ className, light = false }: { className: string; light?: boolean }) {
	const layer = light ? MOBILE_ARTICLE_GLOW.light : MOBILE_ARTICLE_GLOW.dark

	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 z-0 overflow-visible ${className}`}
			style={{
				top: MOBILE_ARTICLE_GLOW_TOP,
				height: artboardScale(layer.h, MOBILE_FRAME.width)
			}}
		>
			<FigmaGlow layer={layer} frameWidth={MOBILE_FRAME.width} lightStops={light} />
		</div>
	)
}

function IntermediateDarkBackground({ className }: { className: string }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible ${className}`}
			style={{ height: INTERMEDIATE_CLIP }}
		>
			<FullBleedHeaderImage
				src={FIGMA.mobile.dark.src}
				clipHeight={INTERMEDIATE_CLIP}
				objectPosition="center top"
				fadeBottom
			/>
		</div>
	)
}

function IntermediateLightBackground({ className }: { className: string }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible ${className}`}
			style={{ height: INTERMEDIATE_CLIP }}
		>
			<FullBleedHeaderImage
				src={FIGMA.desktop.light.src}
				clipHeight={INTERMEDIATE_CLIP}
				objectPosition="center top"
				layerOffsetY={-40}
				fadeBottom
			/>
		</div>
	)
}

export function ResearchAuthorBackground() {
	return (
		<>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 w-full overflow-visible max-lg:min-h-0 lg:min-h-(--desktop-scene-height)"
				style={{ '--desktop-scene-height': DESKTOP_SCENE_HEIGHT } as CSSProperties}
			>
				<DesktopDarkBackground className="hidden lg:dark:block" />
				<DesktopLightBackground className="hidden lg:block lg:dark:hidden" />

				<IntermediateDarkBackground className="hidden max-lg:dark:block" />
				<IntermediateLightBackground className="hidden max-lg:block dark:hidden" />
			</div>

			<MobileArticleGlow className="hidden max-lg:dark:block" />
			<MobileArticleGlow className="hidden max-lg:block dark:hidden" light />
		</>
	)
}
