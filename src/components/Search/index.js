import React from 'react'

import TokenSearch from './TokenSearch'
import NFTSearch from './NFTSearch'
import { useNFTApp } from '../../hooks'

export default function Search({ ...props }) {
  const isNFTApp = useNFTApp()
  if (isNFTApp) {
    return <NFTSearch {...props}/>
  }
  return <TokenSearch {...props} />
}