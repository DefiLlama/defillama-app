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
	/** Visible slice origin + size in artboard px. */
	x: number
	y: number
	w: number
	h: number
	src: string
}

/**
 * Desktop `blue` layers — `36:409` / `47:651`.
 * These dimensions are the visible Figma screenshot slices, not the full off-canvas layer boxes.
 *
 * | Blob        | Source node | Visible crop           |
 * |-------------|-------------|------------------------|
 * | top-right   | 44:344/47:652 | right edge crop       |
 * | bottom-left | 46:637/47:653 | left edge/body crop   |
 * | top-left    | 36:773/47:654 | upper-left crop       |
 */
const DESKTOP_GLOWS = {
	dark: {
		topRight: {
			x: 1059,
			y: 137,
			w: 451,
			h: 712,
			src: `${AUTHOR_BG}/blue-blob-dark.png`
		},
		bottomLeft: {
			x: 0,
			y: 849,
			w: 508,
			h: 742,
			src: `${AUTHOR_BG}/blue-blob-bottom-left-dark.png`
		},
		topLeft: {
			x: 0,
			y: 0,
			w: 508,
			h: 394,
			src: `${AUTHOR_BG}/blue-blob-top-left-dark.png`
		}
	},
	light: {
		topRight: {
			x: 1103,
			y: 172,
			w: 407,
			h: 712,
			src: `${AUTHOR_BG}/blue-blob-light.png`
		},
		bottomLeft: {
			x: 0,
			y: 849,
			w: 508,
			h: 742,
			src: `${AUTHOR_BG}/blue-blob-bottom-left-light.png`
		},
		topLeft: {
			x: 0,
			y: 0,
			w: 381,
			h: 431,
			src: `${AUTHOR_BG}/blue-blob-top-left-light.png`
		}
	}
} as const satisfies Record<string, Record<string, FigmaGlowLayer>>

const INTERMEDIATE_CLIP = 'clamp(580px, 78vh, 760px)'

/** Mobile `Pill bg` visible crop — `55:467` / `56:782`. */
const MOBILE_ARTICLE_GLOW = {
	dark: `${AUTHOR_BG}/pill-bg-mobile-dark.webp`,
	light: `${AUTHOR_BG}/pill-bg-mobile-light.webp`
} as const

type DesktopLayer = {
	clipPx: number
	layerWidth: number
	layerOffsetX: number
	layerOffsetY: number
	src: string
}

/** Scale artboard px → vw (caps at design px above artboard width). */
function artboardScale(px: number, frameWidth: number) {
	const scaled = `${(px / frameWidth) * 100}vw`
	return px < 0 ? `max(${scaled}, ${px}px)` : `min(${scaled}, ${px}px)`
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

function desktopXPct(px: number) {
	return `${(px / DESKTOP_FRAME.width) * 100}%`
}

function figmaLayerOffset(offsetPx: number, basePx: number) {
	return `min(${(offsetPx / basePx) * 100}%, ${offsetPx}px)`
}

function FigmaGlow({ layer }: { layer: FigmaGlowLayer }) {
	return (
		<img
			src={layer.src}
			alt=""
			aria-hidden
			className="pointer-events-none absolute max-w-none select-none"
			style={{
				left: desktopXPct(layer.x),
				top: artboardScale(layer.y, DESKTOP_FRAME.width),
				width: desktopXPct(layer.w),
				height: artboardScale(layer.h, DESKTOP_FRAME.width)
			}}
		/>
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
				className="absolute max-w-none object-cover object-top-left select-none"
				style={
					{
						left: desktopXPct(layerOffsetX),
						top: figmaLayerOffset(layerOffsetY, clipPx),
						width: desktopXPct(layerWidth),
						height: '100%',
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
			<DesktopHeaderImage layer={FIGMA.desktop.dark} clipHeight={clipHeight} />
			<FigmaGlow layer={topLeft} />
			<FigmaGlow layer={topRight} />
			<FigmaGlow layer={bottomLeft} />
		</DesktopSceneShell>
	)
}

function DesktopLightBackground({ className }: { className: string }) {
	const { topRight, bottomLeft, topLeft } = DESKTOP_GLOWS.light
	const clipHeight = desktopClipHeight(FIGMA.desktop.light.clipPx)

	return (
		<DesktopSceneShell className={className}>
			<DesktopHeaderImage layer={FIGMA.desktop.light} clipHeight={clipHeight} />
			<FigmaGlow layer={topLeft} />
			<FigmaGlow layer={topRight} />
			<FigmaGlow layer={bottomLeft} />
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

/** Phone glow extends through the final CTA row. */
function PhoneArticleGlow({ className, light = false }: { className: string; light?: boolean }) {
	const src = light ? MOBILE_ARTICLE_GLOW.light : MOBILE_ARTICLE_GLOW.dark

	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 z-0 overflow-hidden ${className}`}
			style={{
				top: artboardScale(859, MOBILE_FRAME.width),
				bottom: 0
			}}
		>
			<img
				src={src}
				alt=""
				aria-hidden
				className="absolute inset-0 size-full object-fill select-none"
				style={{ opacity: 0.75 }}
			/>
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
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 w-full overflow-visible max-sm:min-h-0 sm:min-h-(--desktop-scene-height)"
				style={{ '--desktop-scene-height': DESKTOP_SCENE_HEIGHT } as CSSProperties}
			>
				<DesktopDarkBackground className="hidden sm:dark:block" />
				<DesktopLightBackground className="hidden sm:block sm:dark:hidden" />

				<IntermediateDarkBackground className="hidden max-sm:dark:block" />
				<IntermediateLightBackground className="hidden max-sm:block dark:hidden" />
			</div>

			<PhoneArticleGlow className="hidden max-sm:dark:block" />
			<PhoneArticleGlow className="hidden max-sm:block dark:hidden" light />
		</>
	)
}
