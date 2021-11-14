import React from 'react'
import styled from 'styled-components'

import PinnedData from '../components/PinnedData'
import SideNav from '../components/SideNav'

export const AppWrapper = styled.div`
  position: relative;
  width: 100%;
`
const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: ${({ open }) => (open ? '220px 1fr 200px' : '220px 1fr 64px')};

  @media screen and (max-width: 1400px) {
    grid-template-columns: 220px 1fr;
  }

  @media screen and (max-width: 1080px) {
    grid-template-columns: 1fr;
    max-width: 100vw;
    overflow: hidden;
    grid-gap: 0;
  }
`

const Right = styled.div`
  position: fixed;
  right: 0;
  bottom: 0rem;
  z-index: 99;
  width: ${({ open }) => (open ? '220px' : '64px')};
  height: ${({ open }) => (open ? 'fit-content' : '64px')};
  overflow: scroll;
  background-color: ${({ theme }) => theme.bg1};
  @media screen and (max-width: 1400px) {
    display: none;
  }
`

const Center = styled.div`
  height: 100%;
  z-index: 9999;
  transition: width 0.25s ease;
  background-color: ${({ theme }) => theme.onlyLight};
`

/**
 * Wrap the component with the header and sidebar pinned tab
 */
export const LayoutWrapper = ({ children, savedOpen, setSavedOpen }) => {
  return (
    <ContentWrapper open={savedOpen}>
      <SideNav />
      <Center id="center">{children}</Center>
      <Right open={savedOpen}>
        <PinnedData open={savedOpen} setSavedOpen={setSavedOpen} />
      </Right>
    </ContentWrapper>
  )
}