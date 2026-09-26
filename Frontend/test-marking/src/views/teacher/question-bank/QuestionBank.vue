<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Ngân hàng câu hỏi</h1>
        <p class="text-sm text-slate-500 mt-0.5">Quản lý và tìm kiếm các bộ câu hỏi trắc nghiệm OMR</p>
      </div>

      <button
        @click="handleCreateNew"
        class="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center space-x-2 shrink-0"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>Tạo ngân hàng mới</span>
      </button>
    </div>

    <!-- Dual Search Bar Section (Triggers on Enter or Button Click) -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
      <!-- Input 1: Search by Name -->
      <div class="md:col-span-5 relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          v-model="inputName"
          @keyup.enter="triggerSearch"
          type="text"
          placeholder="Tìm theo tên ngân hàng câu hỏi..."
          class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
        />
      </div>

      <!-- Input 2: Search by Tag -->
      <div class="md:col-span-4 relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">#</span>
        <input
          v-model="inputTag"
          @keyup.enter="triggerSearch"
          type="text"
          placeholder="Tìm theo thẻ tag..."
          class="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
        />
      </div>

      <!-- Actions: Search Trigger & Reset Filters -->
      <div class="md:col-span-3 flex items-center justify-end space-x-2">
        <button
          @click="triggerSearch"
          class="w-full sm:w-auto flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm py-2 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Tìm kiếm</span>
        </button>

        <button
          v-if="appliedName || appliedTag"
          @click="resetFilters"
          class="p-2 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition shrink-0"
          title="Xóa bộ lọc"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Cards Grid -->
    <div v-if="filteredBanks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <QuestionBankCard
        v-for="bank in filteredBanks"
        :key="bank.id"
        :item="bank"
        @click="handleRouteDetail(bank.id)"
        @share="openShareModal"
        @delete="handleDeleteBank"
        @select-tag="handleTagClick"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3"
    >
      <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 20h8M8 4h8m-4 0v16m-4-8h8" />
        </svg>
      </div>
      <p class="text-sm font-semibold text-slate-700">Không tìm thấy ngân hàng câu hỏi phù hợp</p>
      <p class="text-xs text-slate-400 max-w-sm mx-auto">Thử thay đổi từ khóa tìm kiếm tên hoặc thẻ tag của bạn.</p>
    </div>

    <!-- Share Question Bank Modal Component -->
    <ShareModal
      :isOpen="isShareModalOpen"
      :bank="selectedBankToShare"
      @close="isShareModalOpen = false"
      @update-status="handleUpdateBankStatus"
    />

    <!-- Create Question Bank Modal Component -->
    <CreateQuestionBank
      :is-open="isCreateQuestionBankModalOpen"
      @close="isCreateQuestionBankModalOpen = false"
      @create="handleSaveQuestionBank"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import QuestionBankCard, { type QuestionBankItem } from '@/components/QuestionBankCard.vue'
import ShareModal from '@/components/ShareModal.vue'
import CreateQuestionBank from '@/components/CreateQuestionBank.vue'

const router = useRouter()

// Real-time typed inputs
const inputName = ref('')
const inputTag = ref('')

// Filter criteria applied upon Enter or Search click
const appliedName = ref('')
const appliedTag = ref('')

const isShareModalOpen = ref(false)
const isCreateQuestionBankModalOpen = ref(false)
const selectedBankToShare = ref<QuestionBankItem | null>(null)

const questionBanks = ref<QuestionBankItem[]>([
  {
    id: 1,
    title: 'Ngân hàng câu hỏi Triết học Mác - Lênin 2026',
    description: 'Tổng hợp 200 câu trắc nghiệm ôn thi giữa kỳ và cuối kỳ bộ môn Triết học.',
    subjectName: 'Triết học Mác - Lênin',
    questionCount: 200,
    isPublic: true,
    tags: ['TriếtHọc', 'GiữaKỳ', 'HUST'],
    createdAt: '15/08/2026'
  },
  {
    id: 2,
    title: 'Đề thi Mạng máy tính & FRRouting',
    description: 'Các câu hỏi chuyên sâu về định tuyến OMP, BGP, RIPv1 và cấu hình Router.',
    subjectName: 'Mạng máy tính',
    questionCount: 65,
    isPublic: false,
    tags: ['MạngMáyTính', 'OSPF', 'CuốiKỳ'],
    createdAt: '02/09/2026'
  }
])

const filteredBanks = computed(() => {
  return questionBanks.value.filter((bank) => {
    const matchesName = !appliedName.value.trim() || 
      bank.title.toLowerCase().includes(appliedName.value.toLowerCase().trim())
      
    const matchesTag = !appliedTag.value.trim() || 
      (bank.tags && bank.tags.some(tag => tag.toLowerCase().includes(appliedTag.value.toLowerCase().trim())))

    return matchesName && matchesTag
  })
})

const triggerSearch = () => {
  appliedName.value = inputName.value
  appliedTag.value = inputTag.value
}

const handleTagClick = (tag: string) => {
  inputTag.value = tag
  triggerSearch()
}

const resetFilters = () => {
  inputName.value = ''
  inputTag.value = ''
  appliedName.value = ''
  appliedTag.value = ''
}

const openShareModal = (bank: QuestionBankItem) => {
  selectedBankToShare.value = bank
  isShareModalOpen.value = true
}

const handleUpdateBankStatus = ({ id, isPublic }: { id: string | number; isPublic: boolean }) => {
  const target = questionBanks.value.find(b => b.id === id)
  if (target) {
    target.isPublic = isPublic
  }
}

const handleCreateNew = () => {
  isCreateQuestionBankModalOpen.value = true
}

const handleDeleteBank = (id: string | number) => {
  if (confirm('Bạn có chắc chắn muốn xóa ngân hàng câu hỏi này?')) {
    questionBanks.value = questionBanks.value.filter(b => b.id !== id)
  }
}

const handleSaveQuestionBank = (newBankData: any) => {
  const newBankItem: QuestionBankItem = {
    id: Date.now(),
    title: newBankData.title,
    description: newBankData.description,
    subjectName: newBankData.subjectName,
    questionCount: newBankData.questionCount || 0,
    isPublic: newBankData.isPublic,
    tags: newBankData.tags || [],
    createdAt: new Date().toLocaleDateString('vi-VN')
  }

  questionBanks.value.unshift(newBankItem)
  isCreateQuestionBankModalOpen.value = false
}

const handleRouteDetail = (id: string | number) => {
  router.push({ name: 'TeacherQuestionBankDetail', params: { id } })
}


</script>