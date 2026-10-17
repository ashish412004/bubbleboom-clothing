import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Top Announcement Bar – Non-Clickable Informational Display Suite', () => {
  const headerPath = path.join(process.cwd(), 'src/components/header/header.tsx')
  const headerSource = fs.readFileSync(headerPath, 'utf-8')

  it('preserves exact announcement text default value', () => {
    expect(headerSource).toContain(
      "announcementText = 'FREE SHIPPING ON ALL ORDERS ABOVE ₹1,499 | WEAR THE BOOM'"
    )
  })

  it('ensures announcement bar contains NO Link, anchor tag, href or onClick handlers', () => {
    // Extract the announcement bar JSX snippet from headerSource
    const announcementSnippetMatch = headerSource.match(
      /\{\/\* Informational Announcement Bar[\s\S]*?\{\/\* Main Navigation Bar/
    )
    expect(announcementSnippetMatch).not.toBeNull()
    const snippet = announcementSnippetMatch![0]

    // Verify absence of any navigation or link tags
    expect(snippet).not.toContain('<Link')
    expect(snippet).not.toContain('<a ')
    expect(snippet).not.toContain('href=')
    expect(snippet).not.toContain('onClick=')
    expect(snippet).not.toContain('hover:underline')
    expect(snippet).not.toContain('cursor-pointer')
    expect(snippet).not.toContain('role="link"')
    expect(snippet).not.toContain('tabIndex')
  })

  it('uses non-interactive semantic elements (div and p)', () => {
    const announcementSnippetMatch = headerSource.match(
      /\{\/\* Informational Announcement Bar[\s\S]*?\{\/\* Main Navigation Bar/
    )
    const snippet = announcementSnippetMatch![0]

    expect(snippet).toContain('<div className="bg-black text-white')
    expect(snippet).toContain('<p className=')
    expect(snippet).toContain('{announcementText}')
  })

  it('preserves styling and responsive font sizing for mobile and desktop', () => {
    const announcementSnippetMatch = headerSource.match(
      /\{\/\* Informational Announcement Bar[\s\S]*?\{\/\* Main Navigation Bar/
    )
    const snippet = announcementSnippetMatch![0]

    // Brand styling: black background, white text, uppercase, tracking
    expect(snippet).toContain('bg-black')
    expect(snippet).toContain('text-white')
    expect(snippet).toContain('uppercase')
    expect(snippet).toContain('tracking-wider')
    expect(snippet).toContain('text-center')
    expect(snippet).toContain('py-2')
    expect(snippet).toContain('px-4')

    // Responsive typography: mobile (text-xs) and desktop (sm:text-sm)
    expect(snippet).toContain('text-xs')
    expect(snippet).toContain('sm:text-sm')
  })
})
