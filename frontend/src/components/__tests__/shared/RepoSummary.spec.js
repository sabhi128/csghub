/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://hub.opencsg.com/models/test-org/test-model" }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RepoSummary from '@/components/shared/RepoSummary.vue'

const sampleReadme = `# Sample Model Title\n\nThis is a sample model card README.\nIt has multiple lines.\n\nEnjoy!`

let mockFetchApi = vi.fn().mockImplementation((url) => {
  if (url.includes('/blob/')) {
    return {
      json: () => Promise.resolve({
        data: { value: { data: { content: btoa(sampleReadme) } } },
        error: { value: null }
      })
    }
  }
  return {
    json: () => Promise.resolve({
      data: { value: { data: {} } },
      error: { value: null }
    })
  }
})

vi.mock('@/packs/useFetchApi', () => ({
  default: (url) => mockFetchApi(url)
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  }
}))

describe('RepoSummary.vue README Preview/Raw toggle', () => {
  let wrapper

  beforeEach(() => {
    mockFetchApi.mockClear()
    window.location.href = 'https://hub.opencsg.com/models/test-org/test-model'
  })

  it('renders README toolbar when content is loaded', async () => {
    wrapper = mount(RepoSummary, {
      props: {
        namespacePath: 'test-org/test-model',
        repoType: 'model',
        downloadCount: 100,
        currentBranch: 'main'
      }
    })

    await flushPromises()

    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.text()).toContain('README.md')
    expect(wrapper.find('[data-testid="readme-preview-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="readme-raw-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="readme-copy-btn"]').exists()).toBe(true)
  })

  it('shows SKILL.md title when repoType is skill', async () => {
    wrapper = mount(RepoSummary, {
      props: {
        namespacePath: 'test-org/test-skill',
        repoType: 'skill',
        downloadCount: 10,
        currentBranch: 'main'
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('SKILL.md')
  })

  it('toggles between preview and raw view modes', async () => {
    wrapper = mount(RepoSummary, {
      props: {
        namespacePath: 'test-org/test-model',
        repoType: 'model',
        downloadCount: 100,
        currentBranch: 'main'
      }
    })

    await flushPromises()

    // Default is preview mode
    expect(wrapper.vm.viewMode).toBe('preview')
    expect(wrapper.findComponent({ name: 'MarkdownViewer' }).exists()).toBe(true)
    expect(wrapper.find('[data-testid="readme-raw-container"]').exists()).toBe(false)

    // Switch to raw mode
    const rawBtn = wrapper.find('[data-testid="readme-raw-btn"]')
    await rawBtn.trigger('click')

    expect(wrapper.vm.viewMode).toBe('raw')
    expect(wrapper.find('[data-testid="readme-raw-container"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'MarkdownViewer' }).exists()).toBe(false)

    // Check raw container contents
    const rawCode = wrapper.find('[data-testid="readme-raw-container"] code')
    expect(rawCode.text()).toContain('# Sample Model Title')
    expect(wrapper.vm.lineCount).toBe(sampleReadme.split('\n').length)
    expect(wrapper.vm.charCount).toBe(sampleReadme.length)

    // Switch back to preview mode
    const previewBtn = wrapper.find('[data-testid="readme-preview-btn"]')
    await previewBtn.trigger('click')

    expect(wrapper.vm.viewMode).toBe('preview')
    expect(wrapper.findComponent({ name: 'MarkdownViewer' }).exists()).toBe(true)
    expect(wrapper.find('[data-testid="readme-raw-container"]').exists()).toBe(false)
  })

  it('copies markdown content to clipboard on click', async () => {
    const mockWriteText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText
      },
      writable: true,
      configurable: true
    })

    wrapper = mount(RepoSummary, {
      props: {
        namespacePath: 'test-org/test-model',
        repoType: 'model',
        downloadCount: 100,
        currentBranch: 'main'
      }
    })

    await flushPromises()

    const copyBtn = wrapper.find('[data-testid="readme-copy-btn"]')
    await copyBtn.trigger('click')
    await flushPromises()

    expect(mockWriteText).toHaveBeenCalledWith(sampleReadme)
    expect(wrapper.vm.isCopied).toBe(true)
  })
})
