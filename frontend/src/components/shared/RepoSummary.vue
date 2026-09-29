<template>
  <div class="flex md:px-5 md:flex-col-reverse min-h-[calc(100vh-341px)]">
    <div class="max-w-[60%] sm:max-w-[100%] py-8 pr-6 sm:pr-0 break-words flex-1 md:border-t-0">
      <el-skeleton v-if="loading" class="mt-4" :rows="5" animated />
      <ParquetViewer
        v-if="datasetInfo"
        :datasetInfo="datasetInfo"
        :namespacePath="namespacePath" />
      <!-- README Header Toolbar -->
      <div
        v-if="!loading && readmeContent"
        class="flex items-center justify-between pb-3 mb-4 border-b border-gray-200"
      >
        <div class="flex items-center gap-2 text-sm text-gray-700 font-medium">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{{ repoType === 'skill' ? 'SKILL.md' : 'README.md' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Segmented Toggle: Preview / Raw -->
          <div class="inline-flex p-0.5 bg-gray-100 rounded-md border border-gray-200 text-xs">
            <button
              type="button"
              data-testid="readme-preview-btn"
              @click="viewMode = 'preview'"
              :class="[
                'px-2.5 py-1 rounded font-medium transition-all cursor-pointer',
                viewMode === 'preview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              ]"
            >
              {{ $t('all.preview') }}
            </button>
            <button
              type="button"
              data-testid="readme-raw-btn"
              @click="viewMode = 'raw'"
              :class="[
                'px-2.5 py-1 rounded font-medium transition-all cursor-pointer',
                viewMode === 'raw'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              ]"
            >
              {{ $t('all.raw') }}
            </button>
          </div>
          <!-- One-click Copy Button -->
          <button
            type="button"
            data-testid="readme-copy-btn"
            @click="copyReadmeContent"
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            :title="$t('all.copy')"
          >
            <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{{ isCopied ? $t('all.copySuccess') : $t('all.copy') }}</span>
          </button>
        </div>
      </div>

      <markdown-viewer
        :content="readmeContent"
        :setDefaultText="true"
        v-if="!loading && viewMode === 'preview'"
      >
      </markdown-viewer>

      <!-- Raw Markdown Container -->
      <div
        v-if="!loading && viewMode === 'raw'"
        data-testid="readme-raw-container"
        class="rounded-md border border-gray-200 bg-gray-50 overflow-hidden font-mono text-xs"
      >
        <div class="px-4 py-2 border-b border-gray-200 bg-gray-100 flex items-center justify-between text-xs text-gray-500 font-sans">
          <span>{{ lineCount }} {{ $t('all.lines') }}</span>
          <span>{{ charCount }} {{ $t('all.characters') }}</span>
        </div>
        <pre class="p-4 overflow-x-auto whitespace-pre font-mono text-xs leading-5 text-gray-800 custom-scrollbar max-h-[700px]"><code>{{ activeReadmeText }}</code></pre>
      </div>
    </div>
    <div v-if="showSideSection" class="w-[40%] sm:w-[100%] border-l border-gray-200 md:border-l-0 md:border-b md:w-full md:pl-0">
      <div class="pl-6 py-8">
        <div class="text-gray-700 text-base font-medium text-md leading-[22px] md:pl-0">{{ $t('all.downloadCount') }}</div>
        <div class="text-gray-700 text-base font-semibold leading-6 mt-1 md:pl-0">{{ downloadCount }}</div>
      </div>

      <ModelMetadata
        v-if="repoType == 'model' && metadata && metadata.model_params"
        :framework="framework"
        :data="metadata"
        :namespacePath="namespacePath"
        :currentBranch="currentBranch"
      />
      
      <div v-if="widgetType === 'generation' && endpoint?.status === 'Running'">
        <TestEndpoint
          :appEndpoint="appEndpoint"
          :modelId="namespacePath"
        />
        <div class="px-4 mb-4 flex justify-between items-center">
          <div 
            class="items-center rounded-md gap-1.5 flex cursor-pointer py-2 px-3 btn-tertiary-gray"
            @click="dialogVisibleCode = true" >
            <SvgIcon name="json" />
            <div class="text-gray-600 text-xs leading-[18px]">
              {{ $t('all.viewCode') }}
            </div>
          </div>
          <div
            class="items-center gap-1.5 flex cursor-pointer"
            @click="dialogVisible = true"
          >
            <SvgIcon name="fullscreen" />
            <div class="text-gray-700 text-xs leading-[18px]">
              {{ $t('endpoints.playground.maximum') }}
            </div>
          </div>
        </div>
      </div>

      <SpaceRelationsCard v-if="relations['spaces'] && relations['spaces'].length !== 0"
                          :namespacePath="namespacePath"
                          :spaces="relations['spaces']"
      />

      <CodeRelationsCard v-if="relations['codes'] && relations['codes'].length !== 0"
                          :namespacePath="namespacePath"
                          :codes="relations['codes']"
      />

      <SkillRelationsCard
        v-if="relations['skills'] && relations['skills'].length !== 0"
        :namespacePath="namespacePath"
        :skills="relations['skills']" />

      <DatasetRelationsCard
        v-if="relations['datasets'] && relations['datasets'].length !== 0"
        :namespacePath="namespacePath"
        :datasets="relations['datasets']" />

      <PromptRelationsCard v-if="relations['prompts'] && relations['prompts'].length !== 0"
                          :namespacePath="namespacePath"
                          :prompts="relations['prompts']"
      />

      <ModelRelationsCard v-if="relations['models'] && relations['models'].length !== 0"
                          :namespacePath="namespacePath"
                          :models="relations['models']"
      />
    </div>
  </div>
  <el-dialog
    v-model="dialogVisible"
    fullscreen
    append-to-body
  >
    <TestEndpoint
      v-if="widgetType === 'generation' && endpoint?.status === 'Running'"
      :appEndpoint="appEndpoint"
      :modelId="namespacePath"
    />
  </el-dialog>
  <el-dialog
    v-model="dialogVisibleCode"
    :width="dialogWidth"
    append-to-body
  >
    <RepoSummaryApiExample
      :appEndpoint="appEndpoint"
      :modelId="namespacePath"
    />
  </el-dialog>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
  import MarkdownViewer from '../../components/shared/viewers/MarkdownViewer.vue'
  import ParquetViewer from '../../components/datasets/ParquetViewer.vue'
  import SpaceRelationsCard from '../application_spaces/SpaceRelationsCard.vue'
  import PromptRelationsCard from '../prompts/PromptRelationsCard.vue'
  import CodeRelationsCard from '../codes/CodeRelationsCard.vue'
  import SkillRelationsCard from '../skills/SkillRelationsCard.vue'
  import DatasetRelationsCard from '../datasets/DatasetRelationsCard.vue'
  import ModelRelationsCard from '../models/ModelRelationsCard.vue'
  import TestEndpoint from '../endpoints/playground/TestEndpoint.vue'
  import RepoSummaryApiExample from './RepoSummaryApiExample.vue'
  import useFetchApi from '../../packs/useFetchApi'
  import resolveContent from '../../packs/resolveContent'
  import { ElMessage } from 'element-plus'
  import { useI18n } from 'vue-i18n'
  import ModelMetadata from '../models/ModelMetadata.vue'

  const props = defineProps({
    namespacePath: String,
    downloadCount: Number,
    currentBranch: String,
    widgetType: String,
    repoType: String,
    metadata: Object,
    framework: String
  })

  const { t } = useI18n()

  const dialogVisible = ref(false)
  const dialogVisibleCode = ref(false)
  const dialogWidth = ref('800');
  
  const loading = ref(true)
  const readmeContent = ref('')
  const rawReadmeContent = ref('')
  const relations = ref({})
  const endpoint = ref({})
  const datasetInfo = ref(null)

  const viewMode = ref('preview')
  const isCopied = ref(false)
  const activeReadmeText = computed(() => readmeContent.value || '')

  const lineCount = computed(() => {
    if (!activeReadmeText.value) return 0
    return activeReadmeText.value.split('\n').length
  })

  const charCount = computed(() => {
    return activeReadmeText.value.length
  })

  const copyReadmeContent = async () => {
    const text = activeReadmeText.value
    if (!text) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        throw new Error('Clipboard API unavailable')
      }
      isCopied.value = true
      ElMessage.success(t('all.copySuccess'))
      setTimeout(() => {
        isCopied.value = false
      }, 2000)
    } catch (e) {
      if (typeof document !== 'undefined') {
        const el = document.createElement('textarea')
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        isCopied.value = true
        ElMessage.success(t('all.copySuccess'))
        setTimeout(() => {
          isCopied.value = false
        }, 2000)
      }
    }
  }

  const showSideSection = computed(() => {
    return props.repoType !== 'mcp'
  })

  const handleResize = () => {
    const windowWidth = window.innerWidth;
    if (windowWidth <= 640) {
      dialogWidth.value = '100%';
    } else if (windowWidth <= 768) {
      dialogWidth.value = '500';
    } else if (windowWidth <= 1024) {
      dialogWidth.value = '700';
    } else {
      dialogWidth.value = '800';
    }
  };

  const fetchData = async () => {
    let content = null

    if (props.repoType === 'skill') {
      const result = await useFetchApi(`/${props.repoType}s/${props.namespacePath}/blob/SKILL.md`).json()
      content = result.data.value?.data?.content || null
    }

    if (!content) {
      const result = await useFetchApi(`/${props.repoType}s/${props.namespacePath}/blob/README.md`).json()
      content = result.data.value?.data?.content || null
    }

    if (content) {
      rawReadmeContent.value = content
      resolveReadmeContent()
    }
    loading.value = false
  }

  const fetchCatalog = async () => {
    if (props.repoType !== 'dataset') return

    const { error, data } = await useFetchApi(
      `datasets/${props.namespacePath}/dataviewer/catalog`
    ).json()

    if (data.value) {
      datasetInfo.value = data.value.data.dataset_info
    } else {
      ElMessage.warning(error.value.msg || t('all.fetchError'))
    }
  }

  const fetchRepoRelations = async () => {
    const url = `/${props.repoType}s/${props.namespacePath}/relations`
    const { data } = await useFetchApi(url).json()
    if (data.value) {
      relations.value = data.value.data
    }
  }

  const appEndpoint = computed(() => {
    if (!endpoint.value) return ''

    return `https://${endpoint.value.proxy_endpoint}`
  })

  const fetchEndpoint = async () => {
    const url = `/models/${props.namespacePath}/serverless`

    const { data } = await useFetchApi(url).json()

    if (data.value) {
      endpoint.value = data.value.data
    }
  }

  const resolveReadmeContent = () => {
    let pathname = ''
    try {
      const requestUrl = new URL(window.location?.href || 'https://hub.opencsg.com')
      pathname = requestUrl.pathname
    } catch {
      pathname = window.location?.pathname || ''
    }
    try {
      const content = resolveContent(
        `${props.repoType}s`,
        rawReadmeContent.value,
        props.namespacePath,
        props.currentBranch,
        pathname,
        'md'
      )
      readmeContent.value = content
    } catch {
      readmeContent.value = rawReadmeContent.value
    }
  }

  watch(() => props.currentBranch, resolveReadmeContent)

  onMounted(() => {
    fetchData()
    fetchCatalog()
    if (props.repoType !== 'mcp') {
      fetchRepoRelations()
    }
    if (props.repoType == 'model') {
      fetchEndpoint()
    }
    window.addEventListener('resize', handleResize);
    handleResize();
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
  });

  defineExpose({
    viewMode,
    isCopied,
    rawReadmeContent,
    readmeContent,
    lineCount,
    charCount,
    copyReadmeContent,
    loading
  })
</script>
