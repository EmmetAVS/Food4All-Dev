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

      const isSuccess = color === 'green'
      m.style.backgroundColor = isSuccess
        ? 'oklch(66% 0.17 148 / 0.92)'
        : 'oklch(62% 0.20 25 / 0.92)'
      m.style.backdropFilter = 'blur(8px)'
      m.style.border = `1px solid ${isSuccess ? 'oklch(66% 0.17 148 / 0.4)' : 'oklch(62% 0.20 25 / 0.4)'}`
      m.style.display = 'block'
      m.style.animation = 'fade-in 0.25s ease'

      timerRef.current = setTimeout(() => {
        m.style.animation = 'fade-out 0.25s ease forwards'
        setTimeout(() => { m.style.display = 'none' }, 250)
      }, 2500)
    },
  }))

  return (
    <div ref={containerRef} className="message-container">
      <div ref={textRef} className="message">Error</div>
    </div>
  )
})

export default Message
