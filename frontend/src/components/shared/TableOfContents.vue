<template>
  <div
    v-if="displayHeadings.length > 0"
    class="table-of-contents p-4 border-t border-gray-200"
  >
    <div
      class="flex items-center justify-between cursor-pointer select-none"
      data-testid="toc-header"
      @click="toggleCollapse"
    >
      <div class="flex items-center gap-2 text-md font-medium text-gray-700 leading-6">
        <svg
          class="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h10M4 18h7"
          />
        </svg>
        <span>{{ $t('all.tableOfContents') }}</span>
        <span class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full font-normal">
          {{ displayHeadings.length }}
        </span>
      </div>
      <button
        type="button"
        class="text-gray-400 hover:text-gray-600 p-1 rounded focus:outline-none transition-transform duration-200"
        :class="{ '-rotate-90': isCollapsed }"
        :aria-label="isCollapsed ? 'Expand Table of Contents' : 'Collapse Table of Contents'"
        data-testid="toc-toggle-btn"
        @click.stop="toggleCollapse"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>

    <nav
      v-show="!isCollapsed"
      class="mt-3 space-y-0.5 max-h-[420px] overflow-y-auto pr-1 text-sm custom-scrollbar"
      aria-label="Table of Contents"
      data-testid="toc-nav"
    >
      <a
        v-for="heading in displayHeadings"
        :key="heading.slug"
        :href="`#${heading.slug}`"
        :class="[
          'block py-1 pr-2 transition-colors rounded-r truncate',
          getIndentClass(heading.level),
          activeSlug === heading.slug
            ? 'border-l-2 border-brand-500 text-brand-600 bg-brand-25 font-semibold'
            : 'border-l-2 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        ]"
        :title="heading.title"
        @click.prevent="scrollToHeading(heading.slug)"
      >
        {{ heading.title }}
      </a>
    </nav>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

  const props = defineProps({
    headings: {
      type: Array,
      default: () => []
    }
  })

  const getInitialHash = () => {
    if (typeof window !== 'undefined' && window.location?.hash) {
      return window.location.hash.replace(/^#/, '')
    }
    return ''
  }

  const isCollapsed = ref(false)
  const activeSlug = ref(getInitialHash())

  const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
  }

  const displayHeadings = computed(() => {
    if (!props.headings || !Array.isArray(props.headings)) return []
    // Support H1, H2, H3, H4
    return props.headings.filter((h) => h && h.level && h.level <= 4 && h.title)
  })

  const minLevel = computed(() => {
    if (displayHeadings.value.length === 0) return 1
    return Math.min(...displayHeadings.value.map((h) => h.level))
  })

  const getIndentClass = (level) => {
    const depth = level - minLevel.value
    if (depth === 1) return 'pl-4'
    if (depth === 2) return 'pl-7 text-xs'
    if (depth >= 3) return 'pl-10 text-xs'
    return 'pl-2'
  }

  const scrollToHeading = (slug) => {
    activeSlug.value = slug
    if (typeof document !== 'undefined') {
      const el = document.getElementById(slug)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', `#${slug}`)
      }
    }
  }

  let observer = null

  const setupObserver = () => {
    if (typeof window === 'undefined' || !window.IntersectionObserver) return
    if (observer) {
      observer.disconnect()
      observer = null
    }

    try {
      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries.filter((e) => e.isIntersecting)
          if (visibleEntries.length > 0) {
            visibleEntries.sort(
              (a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
            )
            activeSlug.value = visibleEntries[0].target.id
          }
        },
        {
          rootMargin: '0px 0px -60% 0px',
          threshold: [0, 1.0]
        }
      )

      displayHeadings.value.forEach((heading) => {
        const el = document.getElementById(heading.slug)
        if (el && observer) {
          observer.observe(el)
        }
      })
    } catch (e) {
      // Graceful fallback if observer fails in unusual environments
    }
  }

  watch(
    () => props.headings,
    () => {
      nextTick(() => {
        setupObserver()
      })
    },
    { deep: true }
  )

  onMounted(() => {
    if (typeof window !== 'undefined' && window.location?.hash) {
      const initialSlug = window.location.hash.replace(/^#/, '')
      if (initialSlug) {
        activeSlug.value = initialSlug
      }
    }
    nextTick(() => {
      setupObserver()
    })
  })

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  defineExpose({
    isCollapsed,
    toggleCollapse,
    activeSlug,
    scrollToHeading
  })
</script>

<style scoped>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #d0d5dd;
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
</style>
