import React, { useRef, useEffect } from 'react'
import styled from 'styled-components'
import MenuIcon from './MenuSvg'

const StyledMenuIcon = styled(MenuIcon)`
  path {
    stroke: ${({ theme }) => theme.text1};
  }
`

const Wrapper = styled.button`
  margin: 0;
  padding: 0.15rem 0.5rem;
  height: 35px;
  border: none;
  background-color: ${({ theme }) => theme.bg3};
  border-radius: 0.5rem;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }
  svg {
    margin-top: 2px;
  }
`

export default function NavMenuButton({ setShow, show }) {
  const node = useRef()
  const toggle = () => {
    setShow(!show)
  }

  const handleClick = (e) => {
    if (!(node.current && node.current.contains(e.target))) {
      setShow(false)
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  })

  return (
    <Wrapper onClick={toggle} ref={node}>
      <StyledMenuIcon />
    </Wrapper>
  )
}
