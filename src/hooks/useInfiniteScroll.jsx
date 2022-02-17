import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import { ChevronsUp } from 'react-feather'
import { Button } from 'rebass'

export default function useInfiniteScroll({ list = [], numInView = 25 }) {
  const [dataLength, setDatalength] = useState(numInView)
  const [hasMore, setHasMore] = useState(true)
  const [displayScrollToTopButton, setDisplayScrollToTopButton] = useState(false)

  const { pathname } = useRouter()

  useEffect(() => {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 200) {
        setDisplayScrollToTopButton(true)
      } else {
        setDisplayScrollToTopButton(false)
      }
    })

    return () => {
      window.removeEventListener('scroll', () => {
        setDisplayScrollToTopButton(false)
      })
    }
  }, [])

  useEffect(() => {
    setHasMore(true)
    setDatalength(numInView)

    return () => {
      setHasMore(true)
      setDatalength(25)
    }
  }, [pathname, numInView])

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const next = () => {
    const totalRows = dataLength + numInView

    if (totalRows >= list.length) {
      setDatalength(list.length)
      setHasMore(false)
    } else {
      setDatalength(totalRows)
    }
  }

  const LoadMoreButton = (
    <Button
      displayScrollToTopButton={displayScrollToTopButton}
      onClick={handleScrollToTop}
      sx={{
        borderRadius: '50%',
        padding: 0,
        color: 'inherit',
        width: 36,
        height: 36,
        position: 'fixed',
        zIndex: 1,
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '2rem',
        opacity: 0.2,
        cursor: 'Pointer',
        display: displayScrollToTopButton ? 'inline' : 'none',
      }}
    >
      <ChevronsUp color="black" />
    </Button>
  )

  return {
    dataLength,
    hasMore,
    LoadMoreButton,
    next,
  }
}
