import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TableOfContents from '@/components/shared/TableOfContents.vue'
import MarkdownViewer from '@/components/shared/viewers/MarkdownViewer.vue'

describe('TableOfContents.vue', () => {
  const sampleHeadings = [
    { level: 1, title: 'Introduction', slug: 'introduction' },
    { level: 2, title: 'Model Architecture', slug: 'model-architecture' },
    { level: 3, title: 'Attention Mechanism', slug: 'attention-mechanism' },
    { level: 2, title: 'Usage', slug: 'usage' }
  ]

  beforeEach(() => {
    window.location.hash = ''
  })

  it('does not render when headings array is empty', () => {
    const wrapper = mount(TableOfContents, {
      props: {
        headings: []
      }
    })
    expect(wrapper.find('.table-of-contents').exists()).toBe(false)
  })

  it('does not render when headings prop is null or undefined', () => {
    const wrapper = mount(TableOfContents, {
      props: {
        headings: null
      }
    })
    expect(wrapper.find('.table-of-contents').exists()).toBe(false)
  })

  it('renders heading items and count badge correctly', () => {
    const wrapper = mount(TableOfContents, {
      props: {
        headings: sampleHeadings
      }
    })
    expect(wrapper.find('.table-of-contents').exists()).toBe(true)

    const links = wrapper.findAll('a')
    expect(links).toHaveLength(4)
    expect(links[0].text()).toBe('Introduction')
    expect(links[1].text()).toBe('Model Architecture')
    expect(links[2].text()).toBe('Attention Mechanism')
    expect(links[3].text()).toBe('Usage')

    // Count badge
    expect(wrapper.text()).toContain('4')
  })

  it('applies correct indentation classes based on heading level', () => {
    const wrapper = mount(TableOfContents, {
      props: {
        headings: sampleHeadings
      }
    })
    const links = wrapper.findAll('a')

    // level 1 (minLevel 1 -> depth 0) -> pl-2
    expect(links[0].classes()).toContain('pl-2')
    // level 2 (depth 1) -> pl-4
    expect(links[1].classes()).toContain('pl-4')
    // level 3 (depth 2) -> pl-7
    expect(links[2].classes()).toContain('pl-7')
    // level 2 (depth 1) -> pl-4
    expect(links[3].classes()).toContain('pl-4')
  })

  it('toggles collapse state when header or toggle button is clicked', async () => {
    const wrapper = mount(TableOfContents, {
      props: {
        headings: sampleHeadings
      }
    })

    const nav = wrapper.find('[data-testid="toc-nav"]')
    expect(wrapper.vm.isCollapsed).toBe(false)
    expect(nav.attributes('style')).toBeFalsy()

    // Click header to collapse
    const header = wrapper.find('[data-testid="toc-header"]')
    await header.trigger('click')
    expect(wrapper.vm.isCollapsed).toBe(true)
    expect(nav.attributes('style')).toContain('display: none')

    // Click toggle button to expand
    const btn = wrapper.find('[data-testid="toc-toggle-btn"]')
    await btn.trigger('click')
    expect(wrapper.vm.isCollapsed).toBe(false)
    expect(nav.attributes('style')).not.toContain('display: none')
  })

  it('scrolls to element and updates active slug on click', async () => {
    const mockScrollIntoView = vi.fn()
    const fakeElement = document.createElement('div')
    fakeElement.id = 'model-architecture'
    fakeElement.scrollIntoView = mockScrollIntoView
    document.body.appendChild(fakeElement)

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    const wrapper = mount(TableOfContents, {
      props: {
        headings: sampleHeadings
      }
    })

    const links = wrapper.findAll('a')
    await links[1].trigger('click')

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '#model-architecture')
    expect(links[1].classes()).toContain('text-brand-600')

    document.body.removeChild(fakeElement)
    replaceStateSpy.mockRestore()
  })

  it('initializes active slug from window.location.hash on mount', () => {
    window.location.hash = '#attention-mechanism'

    const wrapper = mount(TableOfContents, {
      props: {
        headings: sampleHeadings
      }
    })

    const links = wrapper.findAll('a')
    // Third link corresponds to attention-mechanism
    expect(links[2].classes()).toContain('text-brand-600')
  })
})

describe('MarkdownViewer heading extraction', () => {
  it('extracts headings and emits headings-change event', async () => {
    const markdown = `# Title\n\nSome text\n\n## Section 1\n\n### Subsection 1.1\n\n## Section 2`

    const wrapper = mount(MarkdownViewer, {
      props: {
        content: markdown
      }
    })

    await flushPromises()

    const emitted = wrapper.emitted('headings-change')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual([
      { level: 1, title: 'Title', slug: 'title' },
      { level: 2, title: 'Section 1', slug: 'section-1' },
      { level: 3, title: 'Subsection 1.1', slug: 'subsection-1.1' },
      { level: 2, title: 'Section 2', slug: 'section-2' }
    ])
  })
})
