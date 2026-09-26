<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Top Bar: Title & Create Examination Button -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Kỳ thi</h1>

      <button
        @click="handleCreateExam"
        class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl transition shadow-md shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer shrink-0"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>Tạo kỳ thi</span>
      </button>
    </div>

    <!-- Search & Date Filter Bar -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <!-- Input 1: Search by Exam Name -->
      <div class="md:col-span-5 relative space-y-1">
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Tên kỳ thi</label>
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            v-model="inputName"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Nhập tên kỳ thi..."
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      <!-- Input 2: From Date -->
      <div class="md:col-span-2 space-y-1">
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Từ ngày</label>
        <input
          v-model="inputFromDate"
          type="date"
          class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
        />
      </div>

      <!-- Input 3: To Date -->
      <div class="md:col-span-2 space-y-1">
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Đến ngày</label>
        <input
          v-model="inputToDate"
          type="date"
          class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
        />
      </div>

      <!-- Search Trigger & Clear Action Buttons -->
      <div class="md:col-span-3 flex items-center space-x-2">
        <button
          @click="handleSearch"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm py-2 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Tìm kiếm</span>
        </button>

        <button
          v-if="appliedName || appliedFromDate || appliedToDate"
          @click="handleReset"
          class="p-2 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition"
          title="Xóa bộ lọc"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Examination List Grid -->
    <div v-if="filteredExaminations.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ExaminationCard
        v-for="exam in filteredExaminations"
        :key="exam.id"
        :exam="exam"
        @click="handleExamClick"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
      <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm font-medium">Không tìm thấy kỳ thi nào phù hợp.</p>
    </div>
  </div>
  <CreateExamination
  :is-open="isCreateExamModal"
  @close="isCreateExamModal = false"
  @save="handleSaveExam"
  ></CreateExamination>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import ExaminationCard, { type ExamItem } from '@/components/ExaminationCard.vue'
import CreateExamination from '@/components/CreateExamination.vue'

const router = useRouter()

// Search Inputs State
const inputName = ref('')
const inputFromDate = ref('')
const inputToDate = ref('')

// Applied Filter State
const appliedName = ref('')
const appliedFromDate = ref('')
const appliedToDate = ref('')

const isCreateExamModal = ref(false)
// Mock Data List
const examinations = ref<ExamItem[]>([
  {
    id: 1,
    name: 'Thi Giữa Kỳ Triết học Mác - Lênin 2026',
    status: 'ONGOING',
    examType: 'OFFLINE_GRADING',
    subject: 'Triết học Mác - Lênin',
    className: 'IT4210E',
    startDate: '2026-09-20'
  },
  {
    id: 2,
    name: 'Thi Cuối Kỳ Hệ Nhúng',
    status: 'UPCOMING',
    examType: 'OFFLINE_GRADING',
    subject: 'Hệ Nhúng',
    className: 'IT4409',
    startDate: '2026-10-05'
  },
  {
    id: 3,
    name: 'Kiểm tra 15 phút Lập trình Kotlin',
    status: 'ENDED',
    examType: 'ONLINE_SUBMISSION',
    subject: 'Phát triển ứng dụng di động',
    className: 'IT4501',
    startDate: '2026-08-10'
  },
  {
    id: 4,
    name: 'Thi Thử Xử lý ảnh OpenCV',
    status: 'CANCELLED',
    examType: 'ONLINE_SUBMISSION',
    subject: 'Thị giác máy tính',
    className: 'IT4800',
    startDate: '2026-07-01'
  }
])

// Filtered Computed Property
const filteredExaminations = computed(() => {
  return examinations.value.filter(exam => {
    // Filter by name
    const matchesName = !appliedName.value.trim() ||
      exam.name.toLowerCase().includes(appliedName.value.toLowerCase().trim())

    // Filter by date range
    let matchesDate = true
    if (exam.startDate) {
      if (appliedFromDate.value && exam.startDate < appliedFromDate.value) {
        matchesDate = false
      }
      if (appliedToDate.value && exam.startDate > appliedToDate.value) {
        matchesDate = false
      }
    }

    return matchesName && matchesDate
  })
})

const handleSearch = () => {
  appliedName.value = inputName.value
  appliedFromDate.value = inputFromDate.value
  appliedToDate.value = inputToDate.value
}

const handleReset = () => {
  inputName.value = ''
  inputFromDate.value = ''
  inputToDate.value = ''
  appliedName.value = ''
  appliedFromDate.value = ''
  appliedToDate.value = ''
}

const handleCreateExam = () => {
  isCreateExamModal.value = true
}

const handleExamClick = (uuid: string | number) => {
  router.push({name: 'TeacherExamDetail', params:{uuid}})
}

const handleSaveExam = () =>{
    console.log('Save')
}


</script>