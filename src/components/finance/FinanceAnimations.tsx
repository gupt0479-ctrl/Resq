"use client"

import { useEffect } from "react"

export function FinanceAnimations() {
  useEffect(() => {
    // ── Section fade-in via Intersection Observer ─────────────────────────────
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-animate-section]")
    )

    sections.forEach((el, i) => {
      el.style.opacity = "0"
      el.style.transform = "translateY(16px)"
      el.style.transition = `opacity 500ms ease-out ${i * 100}ms, transform 500ms ease-out ${i * 100}ms`
    })

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
            sectionObserver.unobserve(el)
          }
        }
      },
      { threshold: 0.06 }
    )

    sections.forEach((el) => sectionObserver.observe(el))

    // ── Cash flow bar width animation ─────────────────────────────────────────
    const bars = Array.from(
      document.querySelectorAll<HTMLElement>("[data-animate-width]")
    )

    const barObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const targetWidth = el.dataset.animateWidth ?? "0%"
            el.style.width = "0%"
            el.style.transition = "width 1000ms ease-out"
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                el.style.width = targetWidth
              })
            })
            barObserver.unobserve(el)
          }
        }
      },
      { threshold: 0.1 }
    )

    bars.forEach((el) => barObserver.observe(el))

    return () => {
      sectionObserver.disconnect()
      barObserver.disconnect()
    }
  }, [])

  return null
}
