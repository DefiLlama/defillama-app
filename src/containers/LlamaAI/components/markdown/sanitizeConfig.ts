import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { rehypeSanitizeStyle } from './rehypeSanitizeStyle'

const SVG_TAGS = [
	'svg',
	'g',
	'path',
	'circle',
	'rect',
	'line',
	'polyline',
	'polygon',
	'ellipse',
	'text',
	'tspan',
	'defs',
	'use',
	'symbol',
	'clipPath',
	'mask',
	'linearGradient',
	'radialGradient',
	'stop',
	'filter',
	'feGaussianBlur',
	'feOffset',
	'feMerge',
	'feMergeNode'
]

const SVG_ATTRS = [
	'viewBox',
	'xmlns',
	'd',
	'fill',
	'stroke',
	'strokeWidth',
	'strokeLinecap',
	'strokeLinejoin',
	'cx',
	'cy',
	'r',
	'rx',
	'ry',
	'x',
	'y',
	'x1',
	'y1',
	'x2',
	'y2',
	'width',
	'height',
	'points',
	'transform',
	'opacity',
	'fillOpacity',
	'strokeOpacity',
	'fillRule',
	'clipRule',
	'textAnchor',
	'dominantBaseline',
	'offset',
	'stopColor',
	'stopOpacity',
	'gradientUnits',
	'gradientTransform',
	'clipPathUnits',
	'maskUnits',
	'stdDeviation',
	'dx',
	'dy',
	'result',
	'in'
]

export const SANITIZE_SCHEMA = {
	...defaultSchema,
	tagNames: [...(defaultSchema.tagNames ?? []), ...SVG_TAGS],
	attributes: {
		...defaultSchema.attributes,
		'*': [...(defaultSchema.attributes?.['*'] ?? []), 'style', 'className', ...SVG_ATTRS]
	}
}

export const SANITIZE_REHYPE_PLUGINS = [rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA], rehypeSanitizeStyle] as any
