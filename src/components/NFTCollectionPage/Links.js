import React from 'react'
import styled from 'styled-components'

import TokenLogo from '../../components/TokenLogo'

const StyledToggle = styled.div`
  display: flex;
  width: fit-content;
  cursor: pointer;
  text-decoration: none;
  margin-top: 1rem;
  color: white;

  :hover {
    text-decoration: none;
  }
`

const IconWrapper = styled.div`
  opacity: 0.7;

  :hover {
    opacity: 1;
  }
`

export default function Links({ logo, links }) {
  const filteredLinks = Object.keys(links)
    .filter((k) => links[k] !== "")
    .reduce((a, k) => ({ ...a, [k]: links[k] }), {})

  const icons = {
    website: <IconWrapper><TokenLogo logo={logo} size="32px" style={{ alignSelf: 'center' }} /></IconWrapper>,
    //discord: <IconWrapper><Discord size={size} color={color} /></IconWrapper>,
    //telegram: <IconWrapper><Telegram size={size} color={color} /></IconWrapper>,
    //twitter: <IconWrapper><Twitter size={size} color={color} /></IconWrapper>,
  }

  const linkComponents = Object.keys(filteredLinks).map((linkName, i) => (
    <span key={i} style={{ paddingRight: '1.00rem' }}>
      <a href={links[linkName]} target="_blank" rel="noopener noreferrer">
        {icons[linkName]}
      </a>
    </span>
  ))


  return <StyledToggle>{linkComponents}</StyledToggle>
}