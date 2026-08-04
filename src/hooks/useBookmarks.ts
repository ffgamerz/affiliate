import { useState, useEffect, useCallback } from 'react'

const BOOKMARKS_KEY = 'bolreview_bookmarks'

export const useBookmarks = () => {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    if (stored) {
      try {
        const arr = JSON.parse(stored) as string[]
        return new Set(arr)
      } catch {
        return new Set()
      }
    }
    return new Set()
  })

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(bookmarkedIds)))
  }, [bookmarkedIds])

  const toggleBookmark = useCallback((id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const addBookmark = useCallback((id: string) => {
    setBookmarkedIds((prev) => new Set([...prev, id]))
  }, [])

  const removeBookmark = useCallback((id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const isBookmarked = useCallback((id: string) => {
    return bookmarkedIds.has(id)
  }, [bookmarkedIds])

  const clearAllBookmarks = useCallback(() => {
    setBookmarkedIds(new Set())
  }, [])

  return {
    bookmarkedIds,
    toggleBookmark,
    addBookmark,
    removeBookmark,
    isBookmarked,
    clearAllBookmarks,
  }
}

export default useBookmarks
