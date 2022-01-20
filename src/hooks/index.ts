import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import copy from 'copy-to-clipboard'
export { default as useInfiniteScroll } from './useInfiniteScroll'
export { default as useFetchInfiniteScroll } from './useFetchInfiniteScroll'
export { default as useProtocolColor } from './useProtocolColor'
export { default as useResize } from './useResize'
export * from './useBreakpoints'

export function useCopyClipboard(timeout = 500) {
  const [isCopied, setIsCopied] = useState(false)

  const staticCopy = useCallback((text) => {
    const didCopy = copy(text)
    setIsCopied(didCopy)
  }, [])

  useEffect(() => {
    if (isCopied) {
      const hide = setTimeout(() => {
        setIsCopied(false)
      }, timeout)

      return () => {
        clearTimeout(hide)
      }
    }
  }, [isCopied, setIsCopied, timeout])

  return [isCopied, staticCopy]
}

export const useOutsideClick = (ref, ref2, callback) => {
  const handleClick = (e) => {
    if (ref.current && ref.current && !ref2.current) {
      callback(true)
    } else if (ref.current && !ref.current.contains(e.target) && ref2.current && !ref2.current.contains(e.target)) {
      callback(true)
    } else {
      callback(false)
    }
  }
  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  })
}

export default function useInterval(callback: () => void, delay: null | number) {
  const savedCallback = useRef<() => void>()

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    function tick() {
      const current = savedCallback.current
      current && current()
    }

    if (delay !== null) {
      tick()
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
    return
  }, [delay])
}

export function useNFTApp() {
  const router = useRouter()
  return router.pathname.startsWith('/nfts')
}

export const useScrollToTop = () => {
  useEffect(() => {
    if (window) {
      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      })
    }
  }, [])
}

export const useIsClient = () => {
  const [isClient, setIsClient] = useState(false)

  const windowType = typeof window

  useEffect(() => {
    if (windowType !== 'undefined') {
      setIsClient(true)
    }
  }, [windowType])

  return isClient
}
