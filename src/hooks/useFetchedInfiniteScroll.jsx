import React, { useState, useEffect, } from 'react'
import { ChevronsUp } from 'react-feather'
import { Button } from 'rebass'

export default function useFetchedInfiniteScroll({
    list = [],
    page = 0,
    limit = 100,
    setPage = () => { },
    setList = () => { },
    fetch = () => { },
    fetchEndpoint = "",
    filters = [] 
}) {

    const [dataLength, setDatalength] = useState(limit)
    const [hasMore, setHasMore] = useState(true)
    const [displayScrollToTopButton, setDisplayScrollToTopButton] = useState(false)

    useEffect(() => {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 200) {
                setDisplayScrollToTopButton(true);
            } else {
                setDisplayScrollToTopButton(false);
            }
        });
    }, [])

    // Reset when category changes or else might be limited if one category is smaller than the other
    const stringifyFilters = JSON.stringify(filters)
    useEffect(() => {
        setHasMore(true)
        setDatalength(limit)
    }, [stringifyFilters, limit])

    const handleScrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    const next = async () => {
        const totalRows = dataLength + limit
        const data = await fetch(`${fetchEndpoint}?page=${page + 1}&limit=${limit}`)
        setList([...list, ...data])

        if (data.length < limit) {
            setDatalength(list.length)
            setHasMore(false)
        } else {
            setDatalength(totalRows)
            setPage(page + 1)
        }
    }

    const LoadMoreButton = (
        <Button displayScrollToTopButton={displayScrollToTopButton} onClick={handleScrollToTop} sx={{
            borderRadius: '50%', padding: 0, color: 'inherit', width: 36, height: 36, position: 'fixed',
            zIndex: 1, left: '50%', transform: 'translateX(-50%)', bottom: '2rem', opacity: 0.2, cursor: 'Pointer',
            display: displayScrollToTopButton ? "inline" : 'none',
        }
        }>
            <ChevronsUp />
        </Button>
    )

    return {
        dataLength,
        hasMore,
        LoadMoreButton,
        next
    }
}