import React from 'react'
import Menu from '../SettingsModal'
import { useNFTApp } from '../../hooks'

export default function RightSettings({ type = 'defi' }) {
  const isNFTApp = useNFTApp()

  if (isNFTApp) {
    type = 'nfts'
  }

  return <Menu type={type} />
}
