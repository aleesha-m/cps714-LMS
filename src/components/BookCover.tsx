import { useState } from 'react'

interface BookCoverProps {
  title: string
  cover: string
  size?: 'sm' | 'md' | 'lg'
}

// Cover image with a typographic fallback, so books without a (working) cover still look intentional.
function BookCover({ title, cover, size = 'md' }: BookCoverProps) {
  const [failedUrl, setFailedUrl] = useState('')
  const showImage = cover !== '' && failedUrl !== cover
  const tone = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5

  return (
    <span className={`book-cover book-cover-${size}`}>
      {showImage ? (
        <img src={cover} alt={`Cover of ${title}`} loading="lazy" onError={() => setFailedUrl(cover)} />
      ) : (
        <span className={`cover-placeholder cover-tone-${tone}`} aria-label={`No cover image for ${title}`}>
          <span>{title}</span>
        </span>
      )}
    </span>
  )
}

export default BookCover
