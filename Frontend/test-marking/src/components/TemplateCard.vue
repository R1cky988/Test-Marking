<template>
  <div
    class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
  >
    <!-- Template Information -->
    <div>
      <div class="flex items-start justify-between gap-2">
        <h3
          @click="openPreview"
          class="font-bold text-slate-800 text-base line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer hover:underline"
          title="Nhấp để xem trước mẫu"
        >
          {{ template.sheetName }}
        </h3>
        <span class="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-full border border-blue-100 shrink-0">
          {{ template.totalQuestions }} câu
        </span>
      </div>
      
      <div class="mt-2 text-xs text-slate-400 space-y-1">
        <p>Tạo ngày: {{ formatDate(template.createdAt) }}</p>
        <p v-if="template.infoBoxCount !== undefined" class="text-slate-500">
          {{ template.infoBoxCount }} khung thông tin phụ
        </p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">

      <!-- PDF Download -->
      <button
        @click="$emit('download', { template, format: 'pdf' })"
        class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition border border-red-100 flex items-center space-x-1"
        title="Tải tệp PDF"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>PDF</span>
      </button>

      <!-- PNG Download -->
      <button
        @click="$emit('download', { template, format: 'png' })"
        class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg transition border border-blue-100 flex items-center space-x-1"
        title="Tải tệp PNG"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>PNG</span>
      </button>

      <!-- Delete Action -->
      <button
        @click="$emit('delete', template.id)"
        class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        title="Xóa mẫu"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Sheet Preview Modal -->
    <Teleport to="body">
      <div
        v-if="isPreviewOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        @click.self="closePreview"
      >
        <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
          
          <!-- Modal Header -->
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h4 class="font-bold text-slate-800 text-lg">{{ template.sheetName }}</h4>
              <p class="text-xs text-slate-500">Mẫu {{ template.totalQuestions }} câu • {{ formatDate(template.createdAt) }}</p>
            </div>
            <button
              @click="closePreview"
              class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Body / Preview Content -->
          <div class="p-6 overflow-y-auto flex justify-center bg-slate-100/50 min-h-[300px] items-center">
            <img
              v-if="template.previewUrl"
              :src="template.previewUrl"
              :alt="template.sheetName"
              class="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md border border-slate-200"
            />
            <!-- Fallback Mock Preview Sheet if no previewUrl is provided -->
            <div
              v-else
              class="w-[480px] h-[640px] bg-white border border-slate-300 rounded-lg p-6 shadow-md flex flex-col justify-between text-slate-700"
            >
              <div class="border-b pb-4 flex justify-between items-center">
                <div>
                  <div class="h-4 w-32 bg-slate-300 rounded mb-2"></div>
                  <div class="h-3 w-20 bg-slate-200 rounded"></div>
                </div>
                <div class="w-16 h-16 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                  Mã đề
                </div>
              </div>

              <!-- Mock Optical Answer Bubbles Grid -->
              <div class="grid grid-cols-2 gap-4 my-auto">
                <div v-for="i in Math.min(10, template.totalQuestions)" :key="i" class="flex items-center space-x-2 text-xs">
                  <span class="w-4 font-bold text-slate-400">{{ i }}.</span>
                  <div class="flex space-x-1.5">
                    <span v-for="opt in ['A', 'B', 'C', 'D']" :key="opt" class="w-5 h-5 rounded-full border border-slate-300 text-[10px] flex items-center justify-center font-bold text-slate-400">
                      {{ opt }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="border-t pt-2 text-center text-[10px] text-slate-400">
                Xem trước mẫu phiếu trả lời trắc nghiệm
              </div>
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="p-4 border-t border-slate-100 bg-white flex items-center justify-end space-x-3">
            <button
              @click="$emit('download', { template, format: 'pdf' })"
              class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
            >
              <span>Tải PDF</span>
            </button>
            <button
              @click="$emit('download', { template, format: 'png' })"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5"
            >
              <span>Tải PNG</span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface TemplateItem {
  id: string | number
  sheetName: string
  totalQuestions: number
  infoBoxCount?: number
  createdAt: string
  previewUrl?: string // Optional field for image preview URL
}

defineProps<{
  template: TemplateItem
}>()

defineEmits<{
  (e: 'download', payload: { template: TemplateItem; format: 'pdf' | 'png' }): void
  (e: 'delete', id: string | number): void
}>()

const isPreviewOpen = ref(false)

const openPreview = () => {
  isPreviewOpen.value = true
}

const closePreview = () => {
  isPreviewOpen.value = false
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('vi-VN')
}
</script>