import React from 'react'

import TokenSearch from './TokenSearch'
import NFTSearch from './NFTSearch'
import YieldSearch from './YieldSearch'
import { useNFTApp, useYieldApp } from '../../hooks'

export default function Search({ ...props }) {
  const isNFTApp = useNFTApp()
  const isYieldApp = useYieldApp()
  if (isNFTApp) {
    return <NFTSearch {...props} />
  } else if (isYieldApp) {
    return <YieldSearch {...props} />
  }
  return <TokenSearch {...props} />
}
