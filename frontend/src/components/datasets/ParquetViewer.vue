<template>
  <div class="flex flex-col border rounded-md p-[16px] gap-[16px]">
    <div class="flex justify-between gap-[16px]">
      <div class="flex w-[181px] h-[28px]">
        <SvgIcon
          name="parquet_viewer"
          width="13px"
          height="13px"
        />
        <p class="ml-[8px] text-gray-900 text-lg leading-[28px]">{{ $t('all.parquet') }}</p>
      </div>
      <!-- <div class="flex items-center justify-center">
        <SvgIcon
          name="parquet_auto_converted"
          width="10px"
          height="10px"
          class="cursor-pointer"
        />
        <p class="ml-[8px] text-gray-500 text-sm leading-[20px]">Auto-converted to Parquet</p>
      </div>
      <div class="flex items-center justify-center cursor-pointer px-[12px] py-[2px] border rounded-xs">
        <SvgIcon
          name="parquet_api"
          width="10px"
          height="6px"
        />
        <p class="ml-[8px] text-xs leading-[18px] text-gray-500">
          API
        </p>
      </div>
      <div class="flex items-center justify-center cursor-pointer px-[12px] py-[2px] border rounded-xs">
        <SvgIcon
          name="parquet_api"
          width="10px"
          height="6px"
        />
        <p class="ml-[8px] text-xs leading-[18px] text-gray-500">
          Go to dataset viewer
        </p>
      </div> -->
    </div>
    <div class="flex justify-between gap-[16px] text-gray-700 text-sm leading-[20px] xl:flex-col">
      <div class="flex flex-col gap-[8px]">
        <p>{{ $t('all.subset') }}（{{ numSubsets }}）</p>
        <el-select
          v-model="subset"
          @change="changeSubsetName"
          placeholder="Select"
          size="large"
          class="!w-[330px] xl:!w-full">
          <template #prefix>
            <span>{{ showRows }} {{ $t('all.rows') }}</span>
          </template>
          <el-option
            v-for="item in datasetInfo"
            :key="item.config_name"
            :label="item.config_name"
            :value="item.config_name" />
        </el-select>
      </div>
      <div v-if="splits" class="flex flex-col gap-[8px]">
        <p>{{ $t('all.split') }}（{{ numSplits }}）</p>
        <el-select
          v-model="split"
          @change="changeSplitName"
          placeholder="Select"
          size="large"
          class="!w-[330px] xl:!w-full">
          <template #prefix>
            <span>{{ showRows }} {{ $t('all.rows') }}</span>
          </template>
          <el-option
            v-for="item in splits"
            :key="item.name"
            :label="item.name"
            :value="item.name">
          </el-option>
        </el-select>
      </div>
    </div>
    <div class="flex flex-col gap-2" data-testid="dataset-search-container">
      <el-input
        v-model="nameFilterInput"
        clearable
        size="large"
        :prefix-icon="Search"
        :placeholder="$t('all.searchDataset')"
        @input="handleInput"
        @clear="handleClear"
        @keyup.enter="handleSearchSubmit"
        class="w-full"
      />
      <div
        v-if="nameFilterInput"
        class="flex items-center justify-between text-xs text-gray-500 px-1"
      >
        <span>
          {{ totalRows }} {{ $t('all.rows') }} {{ $t('all.matching') }} "<strong class="text-gray-700">{{ nameFilterInput }}</strong>"
        </span>
        <button
          data-testid="clear-search-btn"
          type="button"
          @click="handleClear"
          class="text-brand-600 hover:text-brand-700 underline focus:outline-none cursor-pointer"
        >
          {{ $t('all.clearSearch') }}
        </button>
      </div>
    </div>
    <div>
      <el-table :data="tableData"
                border
                stripe
                max-height="420"
                @row-click="toggleRow"
                v-loading="previewLoading"
                class="w-full rounded-md mb-4"
                row-class-name="row-item-clamp cursor-pointer"
                cell-class-name="!align-top">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-8 text-gray-500">
            <svg
              class="w-8 h-8 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p v-if="nameFilterInput" class="text-sm text-gray-600">
              {{ $t('all.noMatchingRows') }} "<span class="font-medium text-gray-800">{{ nameFilterInput }}</span>"
            </p>
            <button
              v-if="nameFilterInput"
              type="button"
              @click="handleClear"
              class="mt-2 text-xs text-brand-600 hover:text-brand-700 underline focus:outline-none cursor-pointer"
            >
              {{ $t('all.clearSearch') }}
            </button>
            <p v-else class="text-sm text-gray-500">
              {{ $t('all.noData') }}
            </p>
          </div>
        </template>
        <el-table-column v-for="column in previewData.columns"
                        :key="column"
                        :prop="column"
                        :label="column"
                        min-width="180" />
      </el-table>
      <CsgPagination
        :perPage="perPage"
        :currentPage="currentPage"
        @currentChange="reloadRows"
        :total="totalRows"
      />
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Search } from '@element-plus/icons-vue'
  import useFetchApi from '../../packs/useFetchApi'
  import CsgPagination from '../shared/CsgPagination.vue'
  import { useI18n } from 'vue-i18n'
  
  const props = defineProps({
    datasetInfo: {
      type: Array,
      default: []

    },
    namespacePath: String
  })

  const { t } = useI18n()
  const previewLoading = ref(false)

  const previewData = ref({ columns: [], rows: [], total: 0 })
  const currentPage = ref(1)
  const totalRows = computed(() => { return previewData.value.total });
  const perPage = ref(4)
  const nameFilterInput = ref('')
  // 默认subset和split的值
  const splits = ref((props.datasetInfo && props.datasetInfo[0]?.splits) || [])
  const subset = ref(props.datasetInfo && props.datasetInfo[0]?.config_name || [])
  const split = ref(splits.value[0]?.name || '')
  const Rows = ref(splits.value[0]?.num_examples || 0)

  const numSplits = computed(() => {
    return splits.value?.length || 0
  })
  const numSubsets = computed(() => {
    return props.datasetInfo?.length || 0
  })

  watch(() => props.datasetInfo, (newValue) => {
    splits.value = (newValue && newValue[0]?.splits) || []
    subset.value = (newValue && newValue[0]?.config_name) || []
    split.value = splits.value[0]?.name || ''
    Rows.value = splits.value[0]?.num_examples || 0
  })

  const tableData = computed(() => {
    if (!previewData.value?.rows || !previewData.value?.columns) {
      return []
    }

    const { rows, columns, columns_type = [] } = previewData.value

    return rows.map(row =>
      columns.reduce((obj, column, index) => {
        const value = row[index]
        obj[column] = columns_type[index] === 'string' ? value : JSON.stringify(value, null, 2)
        return obj
      }, {})
    )
  })

  const showRows = computed(() => {
    let result = ''
    if (Rows.value >= 1000000) {
      result = (Rows.value / 1000000).toFixed(1) + 'M';
    } else if (Rows.value >= 1000) {
      result = (Rows.value / 1000).toFixed(1) + 'K';
    } else {
      result = Rows.value;
    }

    return result
  })

  const toggleRow = (_row, _column, event) => {
    const row = event.target.closest('.el-table__row')
    row.classList.toggle('row-item-clamp')
  }

  const changeSubsetName = (value) => {
    const filteredItem = props.datasetInfo.find(item => item.config_name === value)
    splits.value = filteredItem ? filteredItem.splits: null
    subset.value = filteredItem ? filteredItem.config_name: null
    split.value = splits.value[0]?.name || ''
    Rows.value = splits.value[0]?.num_examples || 0
    currentPage.value = 1
    reloadRows()
  }

  const changeSplitName = (value) => {
    currentPage.value = 1
    Rows.value = splits.value.find(item => item.name === value).num_examples
    reloadRows()
  }

  let searchTimeout = null

  const handleInput = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    searchTimeout = setTimeout(() => {
      currentPage.value = 1
      reloadRows()
    }, 350)
  }

  const handleClear = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    nameFilterInput.value = ''
    currentPage.value = 1
    reloadRows()
  }

  const handleSearchSubmit = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    currentPage.value = 1
    reloadRows()
  }

  const filterChange = () => {
    handleSearchSubmit()
  }

  onBeforeUnmount(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
  })

  const reloadRows = (childCurrent) => {
    if (childCurrent) {
      currentPage.value = childCurrent
    }
    let url = `datasets/${props.namespacePath}/dataviewer/rows`
    url = url + `?page=${childCurrent ? childCurrent : currentPage.value}`
    url = url + `&per=${perPage.value}`
    if (nameFilterInput.value && nameFilterInput.value.trim()) {
      url = url + `&search=${encodeURIComponent(nameFilterInput.value.trim())}`
    }

    url = url + `&namespace=${props.namespacePath.split('/')[0]}`
    url = url + `&config=${subset.value}`
    url = url + `&split=${split.value}`
    loadRows(url)
  }

  async function loadRows(url) {
    previewLoading.value = true
    const { error, data } = await useFetchApi(url).json()
    if (!data.value) {
      ElMessage({
        message: error.value.msg || t('all.fetchError'),
        type: 'warning'
      })
    } else {
      previewData.value = data.value.data
    }
    previewLoading.value = false
  }

  onMounted(() => {
    reloadRows()
  })

  defineExpose({
    nameFilterInput,
    handleInput,
    handleClear,
    handleSearchSubmit,
    filterChange,
    subset,
    split,
    numSubsets,
    numSplits,
    tableData,
    changeSubsetName,
    changeSplitName,
    reloadRows
  })
</script>

<style scoped>
  :deep(.row-item-clamp .cell) {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  :deep(.el-table__header-wrapper th) {
    background-color: #F9FAFB;
  }
</style>
