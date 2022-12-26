import Vibrant from 'node-vibrant'
import { shade } from 'polished'
import { hex } from 'wcag-contrast'
import { tokenIconUrl, peggedAssetIconUrl } from '~/utils'
import { primaryColor } from '~/constants/colors'

export const getColor = async (protocol?: string, logo?: string | null) => {
	let color = primaryColor
	let path = tokenIconUrl(protocol)
	if (!logo?.match(/\.svg$/)) {
		path = logo
	}

	try {
		if (protocol) {
			if (path.match(/\.(jpg|jpeg|png)$/)) {
				await Vibrant.from(path).getPalette((_err, palette) => {
					if (palette?.Vibrant) {
						let detectedHex = palette.Vibrant.hex
						let AAscore = hex(detectedHex, '#FFF')

						while (AAscore < 3) {
							detectedHex = shade(0.005, detectedHex)
							AAscore = hex(detectedHex, '#FFF')
						}

						color = detectedHex
					}
				})
			}
		}
	} catch (error) {
		console.log(`Couldn't get color from ${path}`)
	} finally {
		return color
	}
}

export async function getPeggedColor({ peggedAsset }) {
	let color = primaryColor
	let path = peggedAssetIconUrl(peggedAsset)

	try {
		if (peggedAsset) {
			if (path.match(/\.(jpg|jpeg|png)$/)) {
				await Vibrant.from(path).getPalette((_err, palette) => {
					if (palette?.Vibrant) {
						let detectedHex = palette.Vibrant.hex
						let AAscore = hex(detectedHex, '#FFF')

						while (AAscore < 3) {
							detectedHex = shade(0.005, detectedHex)
							AAscore = hex(detectedHex, '#FFF')
						}

						color = detectedHex
					}
				})
			}
		}
	} catch (error) {
		console.log(`Couldn't get color from ${path}`)
	} finally {
		return color
	}
}
