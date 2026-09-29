import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ParquetViewer from "../../datasets/ParquetViewer.vue";

const mockRowsData = {
  columns: ["id", "text", "label"],
  columns_type: ["int", "string", "string"],
  rows: [
    [1, "First example text", "positive"],
    [2, "Second example text", "negative"]
  ],
  total: 10
};

let lastFetchUrl = '';
let getApiMockFn = vi.fn().mockImplementation((url) => {
  lastFetchUrl = url;
  return Promise.resolve({
    data: { value: { data: mockRowsData } },
    error: { value: null }
  });
});

vi.mock('../../../packs/useFetchApi', () => ({
  default: (url) => ({
    json: () => getApiMockFn(url)
  })
}));

const datasetInfo = [
  {
    config_name: "default",
    splits: [
      { name: "train", num_examples: 100 },
      { name: "test", num_examples: 20 }
    ]
  },
  {
    config_name: "other_subset",
    splits: [
      { name: "train", num_examples: 50 }
    ]
  }
];

describe("ParquetViewer", () => {
  let wrapper;

  beforeEach(() => {
    lastFetchUrl = '';
    getApiMockFn.mockClear();
    wrapper = mount(ParquetViewer, {
      props: {
        datasetInfo,
        namespacePath: "test-namespace/test-dataset"
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mounts correctly", () => {
    expect(wrapper.exists()).toBe(true);
  });

  it("loads rows on mount", () => {
    expect(getApiMockFn).toHaveBeenCalled();
  });

  it("calculates splits and subsets computed properties", () => {
    expect(wrapper.vm.numSubsets).toBe(2);
    expect(wrapper.vm.numSplits).toBe(2);
  });

  it("processes table data correctly", async () => {
    await flushPromises();
    expect(wrapper.vm.tableData).toEqual([
      { id: "1", text: "First example text", label: "positive" },
      { id: "2", text: "Second example text", label: "negative" }
    ]);
  });

  it("updates subset and split variables on dropdown changes", async () => {
    await flushPromises();
    // Change subset
    await wrapper.vm.changeSubsetName("other_subset");
    await flushPromises();
    expect(wrapper.vm.subset).toBe("other_subset");
    expect(wrapper.vm.split).toBe("train");
    expect(wrapper.vm.numSplits).toBe(1);

    // Change split
    await wrapper.vm.changeSplitName("train");
    await flushPromises();
    expect(wrapper.vm.split).toBe("train");
  });

  it("renders search input with localized placeholder", () => {
    const input = wrapper.find('[data-testid="dataset-search-container"] input');
    expect(input.exists()).toBe(true);
    expect(input.attributes('placeholder')).toBe('Search this dataset');
  });

  it("debounces search input and updates query in API request", async () => {
    vi.useFakeTimers();

    wrapper.vm.nameFilterInput = 'example';
    wrapper.vm.handleInput();

    // Not called before debounce timer expires
    expect(lastFetchUrl).not.toContain('search=example');

    // Advance timers by 350ms
    vi.advanceTimersByTime(350);
    await flushPromises();

    expect(lastFetchUrl).toContain('search=example');
  });

  it("submits search immediately on Enter key", async () => {
    wrapper.vm.nameFilterInput = 'urgent';
    wrapper.vm.handleSearchSubmit();
    await flushPromises();

    expect(lastFetchUrl).toContain('search=urgent');
  });

  it("clears search query and reloads rows", async () => {
    wrapper.vm.nameFilterInput = 'temporary';
    wrapper.vm.handleSearchSubmit();
    await flushPromises();
    expect(lastFetchUrl).toContain('search=temporary');

    // Clear search
    wrapper.vm.handleClear();
    await flushPromises();

    expect(wrapper.vm.nameFilterInput).toBe('');
    expect(lastFetchUrl).not.toContain('search=');
  });

  it("displays search match count indicator when query is present", async () => {
    wrapper.vm.nameFilterInput = 'positive';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('positive');
    expect(wrapper.find('[data-testid="clear-search-btn"]').exists()).toBe(true);
  });

  it("renders empty state when no matching rows are found", async () => {
    getApiMockFn.mockImplementationOnce(() =>
      Promise.resolve({
        data: { value: { data: { columns: ["id", "text"], rows: [], total: 0 } } },
        error: { value: null }
      })
    );

    wrapper.vm.nameFilterInput = 'nonexistent';
    wrapper.vm.handleSearchSubmit();
    await flushPromises();

    expect(wrapper.text()).toContain('nonexistent');
    expect(wrapper.find('.el-table__empty-text').exists()).toBe(true);
  });
});
