<template>
  <div class="space-y-10">
    <!-- 1. Header Section -->
    <div>
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Answer sheet template</h1>
      <p class="text-sm text-slate-500 mt-1">
        Nhiều mẫu đáp án phù hợp dựa theo nhu cầu của giáo viên
      </p>
    </div>

    <!-- 2. Main Templates Comparison Table -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="p-4 sm:p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">
                Tính năng / Mẫu
              </th>
              <th class="p-4 sm:p-5 text-xs font-semibold text-blue-600 uppercase tracking-wider text-center w-1/4">
                Mẫu 20 câu
              </th>
              <th class="p-4 sm:p-5 text-xs font-semibold text-blue-600 uppercase tracking-wider text-center w-1/4">
                Mẫu 50 câu
              </th>
              <th class="p-4 sm:p-5 text-xs font-semibold text-blue-600 uppercase tracking-wider text-center w-1/4">
                Mẫu 100 câu
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            
            <!-- Row 1: Template Preview Pictures -->
            <tr>
              <td class="p-4 sm:p-5 font-semibold text-slate-700 bg-slate-50/50">
                Hình ảnh minh họa
              </td>
              
              <td class="p-4 sm:p-5 text-center align-middle">
                <div class="inline-flex flex-col items-center space-y-3">
                  <div 
                    @click="openPreview('/20_ans_template.png', 'Mẫu phiếu trả lời 20 câu')"
                    class="relative w-36 h-48 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-center overflow-hidden shadow-sm group cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <img 
                      src="/20_ans_template.png" 
                      alt="Mẫu phiếu 20 câu" 
                      class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <!-- Hover Zoom Overlay -->
                    <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg class="w-7 h-7 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Badge Label -->
                  <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    Mẫu 20 câu
                  </span>
                </div>
              </td>

              <td class="p-4 sm:p-5 text-center align-middle">
                <div class="inline-flex flex-col items-center space-y-3">
                  <!-- Clickable Image Container -->
                  <div 
                    @click="openPreview('/50_ans_template.png', 'Mẫu phiếu trả lời 50 câu')"
                    class="relative w-36 h-48 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-center overflow-hidden shadow-sm group cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <img 
                      src="/50_ans_template.png" 
                      alt="Mẫu phiếu 50 câu" 
                      class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <!-- Hover Zoom Overlay -->
                    <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg class="w-7 h-7 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Badge Label -->
                  <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    Mẫu 50 câu
                  </span>
                </div>
              </td>

              <td class="p-4 sm:p-5 text-center align-middle">
                <div class="inline-flex flex-col items-center space-y-3">
                  <!-- Clickable Image Container -->
                  <div 
                    @click="openPreview('/100_ans_template.png', 'Mẫu phiếu trả lời 100 câu')"
                    class="relative w-36 h-48 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-center overflow-hidden shadow-sm group cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <img 
                      src="/100_ans_template.png" 
                      alt="Mẫu phiếu 100 câu" 
                      class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <!-- Hover Zoom Overlay -->
                    <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg class="w-7 h-7 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Badge Label -->
                  <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    Mẫu 100 câu
                  </span>
                </div>
              </td>
            </tr>

            <!-- Row 2: Number of Questions -->
            <tr>
              <td class="p-4 sm:p-5 font-semibold text-slate-700 bg-slate-50/50">
                Số lượng câu hỏi
              </td>
              <td class="p-4 sm:p-5 text-center font-medium text-slate-800">20 câu</td>
              <td class="p-4 sm:p-5 text-center font-medium text-slate-800">50 câu</td>
              <td class="p-4 sm:p-5 text-center font-medium text-slate-800">100 câu</td>
            </tr>

            <!-- Row 3: Download PDF Buttons -->
            <tr>
              <td class="p-4 sm:p-5 font-semibold text-slate-700 bg-slate-50/50">
                Tải định dạng PDF
              </td>
              <td class="p-4 sm:p-5 text-center">
                <button
                  @click="downloadTemplate('20', 'pdf')"
                  class="w-full max-w-[140px] inline-flex items-center justify-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-xs rounded-lg transition-colors border border-red-200"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tải PDF
                </button>
              </td>
              <td class="p-4 sm:p-5 text-center">
                <button
                  @click="downloadTemplate('50', 'pdf')"
                  class="w-full max-w-[140px] inline-flex items-center justify-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-xs rounded-lg transition-colors border border-red-200"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tải PDF
                </button>
              </td>
              <td class="p-4 sm:p-5 text-center">
                <button
                  @click="downloadTemplate('100', 'pdf')"
                  class="w-full max-w-[140px] inline-flex items-center justify-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-xs rounded-lg transition-colors border border-red-200"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tải PDF
                </button>
              </td>
            </tr>

            <!-- Row 4: Download PNG Buttons -->
            <tr>
              <td class="p-4 sm:p-5 font-semibold text-slate-700 bg-slate-50/50">
                Tải định dạng PNG
              </td>
              <td class="p-4 sm:p-5 text-center">
                <button
                  @click="downloadTemplate('20', 'png')"
                  class="w-full max-w-[140px] inline-flex items-center justify-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-xs rounded-lg transition-colors border border-blue-200"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Tải PNG
                </button>
              </td>
              <td class="p-4 sm:p-5 text-center">
                <button
                  @click="downloadTemplate('50', 'png')"
                  class="w-full max-w-[140px] inline-flex items-center justify-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-xs rounded-lg transition-colors border border-blue-200"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Tải PNG
                </button>
              </td>
              <td class="p-4 sm:p-5 text-center">
                <button
                  @click="downloadTemplate('100', 'png')"
                  class="w-full max-w-[140px] inline-flex items-center justify-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-xs rounded-lg transition-colors border border-blue-200"
                >
                  <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Tải PNG
                </button>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>

    <!-- SECTION DIVIDER -->
    <div class="relative py-2">
      <div class="absolute inset-0 flex items-center" aria-hidden="true">
        <div class="w-full border-t border-slate-200"></div>
      </div>
      <div class="relative flex justify-center">
        <span class="bg-slate-100 px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>Tùy chỉnh riêng</span>
        </span>
      </div>
    </div>

    <!-- 3. Saved Custom Answer Sheets Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Mẫu Đáp Án Custom Của Tôi</h2>
          <p class="text-xs text-slate-500 mt-0.5">Danh sách các mẫu phiếu bạn tự thiết kế</p>
        </div>

        <button
          @click="isModalOpen = true"
          class="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Tạo Mẫu Mới</span>
        </button>
      </div>

      <!-- Empty State when no custom sheets exist -->
      <div v-if="customSheets.length === 0" class="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
        <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-slate-600">Chưa có mẫu đáp án custom nào</p>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">Tạo mẫu phiếu riêng với số lượng câu hỏi và cấu trúc tùy chỉnh cho môn học của bạn.</p>
      </div>

      <!-- Saved Custom Sheets Cards Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- <div
          v-for="sheet in customSheets"
          :key="sheet.id"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
        >
          <div>
            <div class="flex items-start justify-between">
              <h3 class="font-bold text-slate-800 text-base line-clamp-1">{{ sheet.sheetName }}</h3>
              <span class="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-semibold rounded-full border border-blue-100">
                {{ sheet.totalQuestions }} câu
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1">Tạo ngày: {{ sheet.createdAt }}</p>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              @click="downloadExistedCustomSheet(sheet)"
              class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Tải Phiếu
            </button>
            <button
              @click="deleteCustomSheet(sheet.id)"
              class="p-1.5 text-slate-400 hover:text-red-600 transition"
              title="Xóa mẫu"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div> -->
        <TemplateCard
        v-for="sheet in customSheets"
        :key="sheet.id"
        :template="sheet"
        @download="downloadExistedCustomSheet(sheet)"
        @delete="deleteCustomSheet(sheet.id)"></TemplateCard>
      </div>
    </div>

    <CreateTemplate
      :isOpen="isModalOpen"
      @close="isModalOpen = false"
      @save="handleSaveCustomSheet"
    />

    <PreviewImageModal
    :is-open="previewModal.isOpen"
      :image-src="previewModal.imageSrc"
      :title="previewModal.title"
      @close="previewModal.isOpen = false"></PreviewImageModal>
  </div>
</template>

<script setup lang="ts">
import CreateTemplate from '@/components/CreateTemplate.vue'
import PreviewImageModal from '@/components/PreviewImageModal.vue'
import TemplateCard from '@/components/TemplateCard.vue'
import { ref } from 'vue'

const isModalOpen = ref<boolean>(false)

const downloadTemplate = (count: string, type: 'pdf' | 'png') => {
  console.log(`Downloading ${count}-question template as ${type.toUpperCase()}`)
}

interface CustomSheet {
  id: string
  sheetName: string
  totalQuestions: number
  createdAt: string
}

const previewModal = ref({
  isOpen: false,
  imageSrc: '',
  title: ''
})

const openPreview = (src: string, title?: string) => {
  previewModal.value = {
    isOpen: true,
    imageSrc: src,
    title: title || 'Xem trước mẫu phiếu OMR'
  }
}

const customSheets = ref<CustomSheet[]>([
  {
    id: '1',
    sheetName: 'Phiếu Giữa Kỳ Triết Học',
    totalQuestions: 35,
    createdAt: '22/09/2026'
  }
])

const handleSaveCustomSheet = (newSheetData: any) => {
  customSheets.value.push({
    id: Date.now().toString(),
    sheetName: newSheetData.sheetName,
    totalQuestions: newSheetData.totalQuestions,
    createdAt: new Date().toLocaleDateString('vi-VN')
  })
}

const downloadExistedCustomSheet = (sheet: CustomSheet) => {
  console.log('Downloading custom sheet:', sheet.sheetName)
}

const deleteCustomSheet = (id: string) => {
  customSheets.value = customSheets.value.filter(s => s.id !== id)
}
</script>