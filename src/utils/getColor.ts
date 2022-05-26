import Vibrant from 'node-vibrant'
import { shade } from 'polished'
import { hex } from 'wcag-contrast'
import { primaryColor } from 'constants/colors'
import { tokenIconUrl } from 'utils'

export default async function getColor({ protocol, logo }) {
    let color = primaryColor;

    if (protocol) {
        let path = tokenIconUrl(protocol)
        if (logo) {
            //replace twt image by actual logo
            path = logo
        }

        if (path) {
            await Vibrant.from(path).getPalette((err, palette) => {
                if (palette && palette.Vibrant) {
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

    return color
}