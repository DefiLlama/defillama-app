import type { CSSProperties } from 'react'

const AUTHOR_BG = '/assets/research/author-bg'

/**
 * Figma anchors: mobile 390px frame, desktop 1510px frame.
 * Viewports between those (400–1023px) have no Figma frame — use full-bleed
 * assets + taller clips so stacked hero never hits a hard horizontal line.
 */
const FIGMA = {
	desktop: {
		frameWidth: 1510,
		dark: {
			clipPx: 532,
			layerWidth: 1510,
			layerOffsetX: 0,
			layerOffsetY: -5,
			src: `${AUTHOR_BG}/header-bg-dark-desktop.png`
		},
		light: {
			clipPx: 610,
			layerWidth: 1510,
			layerOffsetX: 0,
			layerOffsetY: -40,
			src: `${AUTHOR_BG}/header-bg-light-desktop.png`
		}
	},
	mobile: {
		frameWidth: 390,
		dark: {
			clipPx: 621,
			src: `${AUTHOR_BG}/header-bg-dark-mobile.png`
		}
	}
} as const

type DesktopLayer = {
	clipPx: number
	layerWidth: number
	layerOffsetX: number
	layerOffsetY: number
	src: string
}

/** Figma clip at lg+ — scales with 1510px frame, caps at design px. */
function desktopClipHeight(clipPx: number) {
	const { frameWidth } = FIGMA.desktop
	return `min(${(clipPx / frameWidth) * 100}vw, ${clipPx}px)`
}

/**
 * Below lg — stacked hero is taller than Figma mobile clip (621px).
 * Full width, scale height with viewport so ~400px and ~900px don't hard-cut mid-hero.
 */
const INTERMEDIATE_CLIP = 'clamp(580px, 78vh, 760px)'

const HEADER_BOTTOM_FADE =
	'[mask-image:linear-gradient(to_bottom,#000_0%,#000_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_88%,transparent_100%)]'

function figmaLayerOffset(offsetPx: number, basePx: number) {
	return `min(${(offsetPx / basePx) * 100}%, ${offsetPx}px)`
}

/** lg+ desktop — Figma layer x/y/width. */
function DesktopHeaderImage({ layer, clipHeight }: { layer: DesktopLayer; clipHeight: string }) {
	const { clipPx, layerWidth, layerOffsetX, layerOffsetY, src } = layer
	const frameWidth = FIGMA.desktop.frameWidth

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
						left: figmaLayerOffset(layerOffsetX, frameWidth),
						top: figmaLayerOffset(layerOffsetY, clipPx),
						width: `min(${(layerWidth / frameWidth) * 100}vw, ${layerWidth}px)`,
						height: clipHeight,
						objectPosition: 'left top'
					} as CSSProperties
				}
			/>
		</div>
	)
}

/** < lg — always 100% viewport width (never cap at 390px). */
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

function DesktopBackground({ layer, className }: { layer: DesktopLayer; className: string }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 top-0 h-0 w-full overflow-visible ${className}`}
		>
			<DesktopHeaderImage layer={layer} clipHeight={desktopClipHeight(layer.clipPx)} />
		</div>
	)
}

function MobilePillGlow({ className, opacity }: { className: string; opacity: number }) {
	return (
		<img
			src={`${AUTHOR_BG}/pill-bg-mobile.png`}
			alt=""
			aria-hidden
			className={`pointer-events-none absolute h-auto max-w-none mix-blend-screen select-none ${className}`}
			style={{ opacity, filter: 'blur(40px)' }}
		/>
	)
}

function MobilePills({ light = false }: { light?: boolean }) {
	const hero = light ? 0.35 : 0.55
	const list = light ? 0.25 : 0.4
	return (
		<>
			<MobilePillGlow className="top-[min(38vh,340px)] -left-[20%] w-[min(140vw,560px)]" opacity={hero} />
			<MobilePillGlow className="top-[min(58vh,520px)] -left-[30%] w-[min(200vw,760px)]" opacity={list} />
		</>
	)
}

/** Dark below lg — mobile mesh, full bleed, extended clip. */
function IntermediateDarkBackground({ className }: { className: string }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 top-0 h-0 w-full overflow-visible ${className}`}
		>
			<FullBleedHeaderImage
				src={FIGMA.mobile.dark.src}
				clipHeight={INTERMEDIATE_CLIP}
				objectPosition="center top"
				fadeBottom
			/>
			<MobilePills />
		</div>
	)
}

/**
 * Light below lg — desktop light mesh (full-bleed gradient), extended clip + soft pills.
 * Avoids the 390px-wide mobile-light export that caused the vertical stripe at ~400px.
 */
function IntermediateLightBackground({ className }: { className: string }) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 top-0 h-0 w-full overflow-visible ${className}`}
		>
			<FullBleedHeaderImage
				src={FIGMA.desktop.light.src}
				clipHeight={INTERMEDIATE_CLIP}
				objectPosition="center top"
				layerOffsetY={-40}
				fadeBottom
			/>
			<MobilePills light />
		</div>
	)
}

export function ResearchAuthorBackground() {
	return (
		<div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-0 w-full overflow-visible">
			{/* lg+ — Figma desktop frames */}
			<DesktopBackground layer={FIGMA.desktop.dark} className="hidden lg:dark:block" />
			<DesktopBackground layer={FIGMA.desktop.light} className="hidden lg:block lg:dark:hidden" />

			{/* < lg — no Figma frame; full-bleed + tall clip for 400–1023px */}
			<IntermediateDarkBackground className="hidden max-lg:dark:block" />
			<IntermediateLightBackground className="hidden max-lg:block dark:hidden" />
		</div>
	)
}
