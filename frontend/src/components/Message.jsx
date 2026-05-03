import { forwardRef, useImperativeHandle, useRef } from 'react'

const Message = forwardRef(function Message(_, ref) {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const timerRef = useRef(null)

  useImperativeHandle(ref, () => ({
    show(text, color = 'red') {
      if (!containerRef.current || !textRef.current) return
      if (timerRef.current) clearTimeout(timerRef.current)

      const m = containerRef.current
      textRef.current.innerText = text
      m.style.backgroundColor = color
      m.style.display = 'block'
      m.style.animation = 'fade-in 0.3s'

      timerRef.current = setTimeout(() => {
        m.style.animation = 'fade-out 0.3s'
        setTimeout(() => {
          m.style.display = 'none'
        }, 300)
      }, 2000)
    },
  }))

  return (
    <div ref={containerRef} className="message-container">
      <div ref={textRef} className="message">Error</div>
    </div>
  )
})

export default Message
