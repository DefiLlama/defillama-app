import { useEffect, useState } from 'react'
import Vibrant from 'node-vibrant'
import { shade } from 'polished'
import { hex } from 'wcag-contrast'

import { primaryColor } from 'constants/colors'
import { tokenIconUrl } from 'utils'

const useProtocolColor = ({ protocol = '', logo = '', color = primaryColor }) => {
  const [protocolColor, setProtocolColor] = useState(color)
  useEffect(() => {
    const fetchColor = () => {
      if (protocol) {
        var path = tokenIconUrl(protocol)
        if (logo) {
          //replace twt image by actual logo
          path = logo
        }

        if (path) {
          Vibrant.from(path).getPalette((err, palette) => {
            if (palette && palette.Vibrant) {
              let detectedHex = palette.Vibrant.hex
              let AAscore = hex(detectedHex, '#FFF')
              while (AAscore < 3) {
                detectedHex = shade(0.005, detectedHex)
                AAscore = hex(detectedHex, '#FFF')
              }
              setProtocolColor(detectedHex)
            }
          })
        }
      }
    }
    fetchColor()
  }, [protocol, logo])

  return protocolColor
}

export default useProtocolColor
