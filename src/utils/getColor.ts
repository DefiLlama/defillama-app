import Vibrant from 'node-vibrant'
import { shade } from 'polished'
import { hex } from 'wcag-contrast'
import { primaryColor } from 'constants/colors'
import { tokenIconUrl } from 'utils'

export const getColor = async (protocol?: string, logo?: string) => {
  let color = primaryColor

  try {
    if (protocol) {
      let path = `https://defillama.com${tokenIconUrl(protocol)}`

      if (!logo?.match(/\.svg$/)) {
        path = logo
      }

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
    console.log(error)
  } finally {
    return color
  }
}
