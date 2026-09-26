<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
    >
      <!-- Modal Container -->
      <div
        class="bg-white rounded-2xl shadow-2xl border w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <!-- Modal Header -->
        <div
          class="h-16 px-6 bg-slate-900 text-white flex items-center justify-between shrink-0"
        >
          <div class="flex items-center space-x-2">
            <div
              class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold"
            >
              OMR
            </div>
            <h3 class="font-bold text-lg">Tạo Mẫu Đáp Án Custom</h3>
          </div>
          <button
            @click="closeModal"
            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Body (Two Column Grid) -->
        <div class="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          <!-- LEFT COLUMN: Form Controls -->
          <div class="md:col-span-6 p-6 overflow-y-auto space-y-6">
            
            <!-- 1. Sheet Name -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên Mẫu Đáp Án <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.sheetName"
                type="text"
                placeholder="Ví dụ: Phiếu Giữa Kỳ Triết Học"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <!-- 2. Header Info Boxes -->
            <div class="space-y-3">
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Khung Thông Tin Bổ Sung (Max 2)
              </label>
              
              <div class="flex items-center space-x-3">
                <button
                  v-for="count in [0, 1, 2]"
                  :key="count"
                  type="button"
                  @click="setInfoBoxCount(count)"
                  :class="[
                    'px-4 py-2 text-xs font-semibold rounded-lg border transition-all',
                    form.infoBoxCount === count
                      ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  ]"
                >
                  {{ count }} Khung
                </button>
              </div>

              <!-- Title inputs for Info Boxes -->
              <div v-if="form.infoBoxCount > 0" class="space-y-2 pt-2">
                <div v-for="index in form.infoBoxCount" :key="index">
                  <input
                    v-model="form.infoBoxTitles[index - 1]"
                    type="text"
                    :placeholder="`Tiêu đề khung ${index} (Ví dụ: Lớp học / Môn thi)`"
                    class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            <!-- 3. Question Blocks Configurator -->
            <div class="space-y-3 border-t border-slate-100 pt-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Cấu Trúc Câu Hỏi
                  </label>
                  <p class="text-[11px] text-slate-400">Tùy chỉnh số đáp án / câu cho từng phần</p>
                </div>

                <!-- <button
                  type="button"
                  @click="addQuestionBlock"
                  class="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Thêm Phần
                </button> -->
              </div>

              <!-- Question Blocks List -->
              <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
                <div
                  v-for="(block, idx) in form.blocks"
                  :key="idx"
                  class="p-3 bg-slate-50 rounded-xl border border-slate-200 relative group space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-700">Phần {{ idx + 1 }}</span>
                    <button
                      v-if="form.blocks.length > 1"
                      @click="removeQuestionBlock(idx)"
                      class="text-slate-400 hover:text-red-600 transition"
                      title="Xóa phần này"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[10px] text-slate-500 font-medium">Số lượng câu</label>
                      <input
                        v-model.number="block.questionCount"
                        type="number"
                        min="1"
                        max="100"
                        class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label class="block text-[10px] text-slate-500 font-medium">Lựa chọn/dòng (Max 5)</label>
                      <select
                        v-model.number="block.choicesPerRow"
                        class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option :value="2">2 (A, B)</option>
                        <option :value="3">3 (A, B, C)</option>
                        <option :value="4">4 (A, B, C, D)</option>
                        <option :value="5">5 (A, B, C, D, E)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Total Question Counter -->
            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 bg-blue-50/60 p-3 rounded-lg border border-blue-100">
              <span>Tổng số câu hỏi:</span>
              <span class="text-blue-600 font-bold text-sm">{{ totalQuestions }} / 100 câu</span>
            </div>

          </div>

          <div class="md:col-span-6 p-6 bg-slate-100/70 flex flex-col justify-between relative overflow-hidden">
            
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Xem Trước Mẫu Phiếu (A4 Live Preview)
              </span>
              <button
                @click="generatePreview"
                class="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Cập nhật</span>
              </button>
            </div>

            <div
              v-if="errorMessage"
              class="absolute inset-x-6 top-1/2 -translate-y-1/2 z-20 p-5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-red-200 text-center space-y-3"
            >
              <div class="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-800">Không thể tạo mẫu đáp án</h4>
                <p class="text-xs text-red-600 mt-1">{{ errorMessage }}</p>
              </div>
              <button
                @click="errorMessage = ''"
                class="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition"
              >
                Đóng
              </button>
            </div>

            <div class="flex-1 bg-white border border-slate-300 rounded-xl p-4 shadow-md overflow-y-auto max-h-[500px] text-[10px] space-y-4">
              
              <div class="flex items-start justify-between border-b pb-2">
                <div class="w-6 h-6 bg-slate-900 flex items-center justify-center text-white text-[8px] font-bold">
                  ArUco
                </div>
                <div class="text-center font-bold text-slate-800 uppercase tracking-tight text-xs">
                  {{ form.sheetName || 'TÊN MẪU PHIẾU CHƯA ĐẶT' }}
                </div>
                <div class="w-6 h-6 bg-slate-900 flex items-center justify-center text-white text-[8px] font-bold">
                  ArUco
                </div>
              </div>

              <div v-if="form.infoBoxCount > 0" class="grid grid-cols-2 gap-2">
                <div
                  v-for="(title, idx) in activeInfoTitles"
                  :key="idx"
                  class="border border-slate-300 rounded p-1.5 bg-slate-50"
                >
                  <span class="font-bold text-slate-600 block">{{ title }}:</span>
                  <div class="border-b border-dashed border-slate-300 mt-2"></div>
                </div>
              </div>

              <div class="grid grid-cols-12 gap-2 border p-2 rounded bg-slate-50/50">
                <div class="col-span-8 border-r pr-2">
                  <span class="font-bold text-slate-700 block mb-1">SỐ BÁO DANH (9 chữ số)</span>
                  <div class="grid grid-cols-9 gap-1 text-center font-mono">
                    <div v-for="i in 9" :key="i" class="border rounded bg-white py-0.5 text-[8px]">
                      0
                    </div>
                  </div>
                </div>
                <div class="col-span-4">
                  <span class="font-bold text-slate-700 block mb-1">MÃ ĐỀ (3 chữ số)</span>
                  <div class="grid grid-cols-3 gap-1 text-center font-mono">
                    <div v-for="i in 3" :key="i" class="border rounded bg-white py-0.5 text-[8px]">
                      0
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(block, bIdx) in form.blocks"
                  :key="bIdx"
                  class="space-y-1.5"
                >
                  <span class="font-bold text-slate-600 text-[9px] uppercase tracking-wider block">
                    Phần {{ bIdx + 1 }} ({{ block.questionCount }} câu - {{ block.choicesPerRow }} đáp án)
                  </span>

                  <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div
                      v-for="qNum in getQuestionNumbers(bIdx)"
                      :key="qNum"
                      class="flex items-center justify-between border-b border-slate-100 py-0.5"
                    >
                      <span class="font-semibold text-slate-500 w-5">{{ qNum }}.</span>
                      <div class="flex items-center space-x-1.5">
                        <div
                          v-for="opt in getOptionLabels(block.choicesPerRow)"
                          :key="opt"
                          class="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[7px] text-slate-600 font-bold"
                        >
                          {{ opt }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        <div class="h-16 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition"
          >
            Hủy Bỏ
          </button>

          <div class="flex items-center space-x-3">
            <button
              type="button"
              @click="generatePreview"
              class="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Xem Thử (Preview)
            </button>
            <button
              type="button"
              @click="saveAnswerSheet"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center space-x-1.5"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Lưu Mẫu Đáp Án</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface QuestionBlock {
  questionCount: number
  choicesPerRow: number
}

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'save'])

const form = ref({
  sheetName: '',
  infoBoxCount: 1,
  infoBoxTitles: ['Lớp học', 'Ghi chú'],
  blocks: [
    { questionCount: 20, choicesPerRow: 4 }
  ] as QuestionBlock[]
})

const errorMessage = ref<string>('')

const totalQuestions = computed(() => {
  return form.value.blocks.reduce((acc, b) => acc + (b.questionCount || 0), 0)
})

const activeInfoTitles = computed(() => {
  return form.value.infoBoxTitles.slice(0, form.value.infoBoxCount).map((t, idx) => t || `Khung thông tin ${idx + 1}`)
})

const setInfoBoxCount = (count: number) => {
  form.value.infoBoxCount = count
}

const addQuestionBlock = () => {
  if (totalQuestions.value >= 100) {
    errorMessage.value = 'Tổng số câu hỏi không được vượt quá 100 câu.'
    return
  }
  form.value.blocks.push({ questionCount: 10, choicesPerRow: 4 })
}

const removeQuestionBlock = (index: number) => {
  form.value.blocks.splice(index, 1)
}

const getOptionLabels = (choicesCount: number) => {
  const options = ['A', 'B', 'C', 'D', 'E']
  return options.slice(0, choicesCount)
}

const getQuestionNumbers = (blockIndex: number) => {
  let startNum = 1
  for (let i = 0; i < blockIndex; i++) {
    startNum += form.value.blocks[i].questionCount || 0
  }
  const count = form.value.blocks[blockIndex].questionCount || 0
  return Array.from({ length: count }, (_, i) => startNum + i)
}

const validateForm = (): boolean => {
  errorMessage.value = ''

  if (!form.value.sheetName.trim()) {
    errorMessage.value = 'Vui lòng nhập tên mẫu đáp án.'
    return false
  }

  if (totalQuestions.value <= 0) {
    errorMessage.value = 'Tổng số câu hỏi phải lớn hơn 0.'
    return false
  }

  if (totalQuestions.value > 100) {
    errorMessage.value = `Tổng số câu hỏi (${totalQuestions.value}) vượt quá giới hạn tối đa 100 câu.`
    return false
  }

  for (const block of form.value.blocks) {
    if (block.choicesPerRow < 2 || block.choicesPerRow > 5) {
      errorMessage.value = 'Số lượng đáp án cho mỗi câu phải từ 2 đến 5 Lựa chọn.'
      return false
    }
  }

  return true
}

const generatePreview = () => {
  validateForm()
}

const saveAnswerSheet = () => {
  if (!validateForm()) return

  emit('save', {
    ...form.value,
    totalQuestions: totalQuestions.value
  })
  closeModal()
}

const closeModal = () => {
  errorMessage.value = ''
  emit('close')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>