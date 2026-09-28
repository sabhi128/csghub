/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://hub.opencsg.com/models/test-namespace/test-repo" }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import FileList from '@/components/shared/FileList.vue'

const mockFiles = [
  {
    name: 'config.json',
    type: 'file',
    path: 'config.json',
    size: 1024,
    lfs: false,
    last_commit_sha: 'abc1234',
    commit: { message: 'Add config', committer_date: '2026-09-01T00:00:00Z' }
  },
  {
    name: 'model.safetensors',
    type: 'file',
    path: 'model.safetensors',
    size: 5242880,
    lfs: true,
    last_commit_sha: 'def5678',
    commit: { message: 'Add weights', committer_date: '2026-09-01T00:00:00Z' }
  },
  {
    name: 'tokenizer',
    type: 'dir',
    path: 'tokenizer',
    size: 0,
    lfs: false,
    last_commit_sha: 'ghi9012',
    commit: { message: 'Add tokenizer dir', committer_date: '2026-09-01T00:00:00Z' }
  }
]

let { mockFetchApi } = vi.hoisted(() => {
  return {
    mockFetchApi: vi.fn((url) => ({
      json: () => {
        if (url.includes('/last_commit')) {
          return Promise.resolve({
            data: {
              value: {
                data: {
                  id: 'commit123',
                  author_name: 'CSG Developer',
                  message: 'Initial commit',
                  committer_date: '2026-09-01T00:00:00Z'
                }
              }
            },
            error: { value: null },
            response: { value: { status: 200 } }
          })
        }
        return Promise.resolve({
          data: {
            value: {
              data: {
                Files: mockFiles,
                Cursor: ''
              }
            }
          },
          error: { value: null },
          response: { value: { status: 200 } }
        })
      }
    }))
  }
})

vi.mock('@/packs/useFetchApi', () => ({
  default: mockFetchApi
}))

const mockSetRepoTab = vi.fn()
const mockResetFileNotFound = vi.fn()
vi.mock('@/stores/RepoTabStore', () => ({
  useRepoTabStore: () => ({
    repoTab: {
      currentBranch: 'main',
      lastPath: '',
      actionName: 'files',
      fileNotFound: { show: false }
    },
    setRepoTab: mockSetRepoTab,
    resetFileNotFound: mockResetFileNotFound
  })
}))

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    currentRoute: { value: { path: '/models/test-namespace/test-repo' } }
  }),
  useRoute: () => ({
    query: { tab: 'files' }
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key, params) => {
      if (params) {
        let str = key
        for (const [k, v] of Object.entries(params)) {
          str += ` ${k}=${v}`
        }
        return str
      }
      return key
    }),
    locale: { value: 'en' }
  })
}))

describe('FileList.vue', () => {
  let wrapper

  const createWrapper = (props = {}) => {
    return mount(FileList, {
      props: {
        namespacePath: 'test-namespace/test-repo',
        canWrite: true,
        defaultBranch: 'main',
        ...props
      },
      global: {
        stubs: {
          BranchDropdown: true,
          CsgButton: true,
          ElAlert: true,
          ElAvatar: true,
          ElPopover: true,
          ElDropdown: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElBreadcrumb: true,
          ElBreadcrumbItem: true,
          ElSkeleton: true,
          SvgIcon: true,
          ElInput: {
            template: '<input class="el-input-mock" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue', 'placeholder', 'clearable', 'size', 'prefixIcon']
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = createWrapper()
  })

  it('mounts and renders file list correctly', async () => {
    await flushPromises()
    await nextTick()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.vm.files.length).toBe(3)
    const fileRows = wrapper.findAll('.file-row-item')
    expect(fileRows.length).toBe(3)
  })

  it('displays the file filter input when files exist', async () => {
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.file-filter-input').exists()).toBe(true)
  })

  it('returns all files when filterQuery is empty', async () => {
    await flushPromises()
    await nextTick()

    expect(wrapper.vm.filterQuery).toBe('')
    expect(wrapper.vm.filteredFiles.length).toBe(3)
  })

  it('filters files in real-time matching query (case-insensitive)', async () => {
    await flushPromises()
    await nextTick()

    wrapper.vm.filterQuery = 'CONFIG'
    await nextTick()

    expect(wrapper.vm.filteredFiles.length).toBe(1)
    expect(wrapper.vm.filteredFiles[0].name).toBe('config.json')

    const fileRows = wrapper.findAll('.file-row-item')
    expect(fileRows.length).toBe(1)
  })

  it('filters directory and file names correctly', async () => {
    await flushPromises()
    await nextTick()

    wrapper.vm.filterQuery = 'token'
    await nextTick()

    expect(wrapper.vm.filteredFiles.length).toBe(1)
    expect(wrapper.vm.filteredFiles[0].name).toBe('tokenizer')
    expect(wrapper.vm.filteredFiles[0].type).toBe('dir')
  })

  it('displays filter count badge when filterQuery is active', async () => {
    await flushPromises()
    await nextTick()

    wrapper.vm.filterQuery = 'model'
    await nextTick()

    const badge = wrapper.find('.filter-count-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('1 of 3 files')
  })

  it('displays empty filter state when no files match', async () => {
    await flushPromises()
    await nextTick()

    wrapper.vm.filterQuery = 'nonexistent-file.txt'
    await nextTick()

    expect(wrapper.vm.filteredFiles.length).toBe(0)
    const emptyState = wrapper.find('.empty-filter-state')
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('nonexistent-file.txt')
  })

  it('restores all files when filterQuery is cleared', async () => {
    await flushPromises()
    await nextTick()

    wrapper.vm.filterQuery = 'config'
    await nextTick()
    expect(wrapper.vm.filteredFiles.length).toBe(1)

    wrapper.vm.filterQuery = ''
    await nextTick()
    expect(wrapper.vm.filteredFiles.length).toBe(3)
    expect(wrapper.find('.empty-filter-state').exists()).toBe(false)
  })

  it('resets filterQuery when navigating to a directory via goToDir', async () => {
    await flushPromises()
    await nextTick()

    wrapper.vm.filterQuery = 'config'
    expect(wrapper.vm.filterQuery).toBe('config')

    wrapper.vm.goToDir('tokenizer')
    expect(wrapper.vm.filterQuery).toBe('')
  })
})
