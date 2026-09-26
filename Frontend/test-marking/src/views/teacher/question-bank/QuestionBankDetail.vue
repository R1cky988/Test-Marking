<template>
  <div class="space-y-6">
    <!-- Top Bar: Back Button, Title, Created Date, and Action Buttons -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      
      <!-- Left Header Section -->
      <div class="space-y-1">
        <button
          @click="goBack"
          class="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-1"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Quay lại danh sách ngân hàng</span>
        </button>

        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">
          {{ bankDetails.title || 'Ngân Hàng Câu Hỏi' }}
        </h1>

        <div class="flex items-center space-x-3 text-xs text-slate-400">
          <span class="flex items-center space-x-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Ngày tạo: {{ bankDetails.createdAt }}</span>
          </span>
          <span>•</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
            {{ bankDetails.subjectName }}
          </span>
        </div>
      </div>

      <!-- Right Action Buttons -->
      <div class="flex items-center space-x-2.5 shrink-0">
        <!-- Refresh Button -->
        <button
          @click="handleRefresh"
          :disabled="isRefreshing"
          class="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm rounded-xl border border-slate-200 shadow-sm transition flex items-center space-x-1.5"
          title="Làm mới dữ liệu"
        >
          <svg
            :class="['w-4 h-4 text-slate-500', { 'animate-spin': isRefreshing }]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="hidden sm:inline">Làm mới</span>
        </button>

        <!-- Export Button -->
        <button
          @click="handleExport"
          class="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm rounded-xl border border-slate-200 shadow-sm transition flex items-center space-x-1.5"
        >
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Xuất File</span>
        </button>

        <!-- Create Question Button -->
        <button
          @click="handleCreateQuestion"
          class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl transition shadow-md shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Tạo câu hỏi</span>
        </button>
      </div>

    </div>

    <!-- 4 Built-in Metrics Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Questions -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tất cả câu hỏi</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ metrics.total }}</h3>
        </div>
        <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 20h8M8 4h8m-4 0v16m-4-8h8" />
          </svg>
        </div>
      </div>

      <!-- Easy Questions -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Mức Dễ</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ metrics.easy }}</h3>
        </div>
        <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <!-- Medium Questions -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-amber-600 uppercase tracking-wider">Mức Trung Bình</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ metrics.medium }}</h3>
        </div>
        <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>

      <!-- Hard Questions -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-red-600 uppercase tracking-wider">Mức Khó</p>
          <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ metrics.hard }}</h3>
        </div>
        <div class="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Search Section (Deferred until Enter / Search button click) -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
      
      <!-- Input 1: Content Search -->
      <div class="md:col-span-6 relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          v-model="inputContent"
          @keyup.enter="triggerSearch"
          type="text"
          placeholder="Tìm nội dung câu hỏi (Nhấn Enter hoặc nút Tìm kiếm)..."
          class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
        />
      </div>

      <!-- Input 2: Difficulty Selector -->
      <div class="md:col-span-4">
        <select
          v-model="inputDifficulty"
          @keyup.enter="triggerSearch"
          class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
        >
          <option value="ALL">Tất cả độ khó</option>
          <option value="EASY">Dễ (Easy)</option>
          <option value="MEDIUM">Trung bình (Medium)</option>
          <option value="HARD">Khó (Hard)</option>
        </select>
      </div>

      <!-- Search Trigger Button -->
      <div class="md:col-span-2 flex items-center space-x-2">
        <button
          @click="triggerSearch"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm py-2 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Tìm kiếm</span>
        </button>

        <button
          v-if="appliedContent || appliedDifficulty !== 'ALL'"
          @click="resetSearch"
          class="p-2 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition"
          title="Xóa tìm kiếm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

    </div>

    <!-- Questions Table -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th class="p-4 w-12 text-center">STT</th>
              <th class="p-4 w-2/5">Nội dung câu hỏi</th>
              <th class="p-4 w-2/5">Đáp án (Lựa chọn)</th>
              <th class="p-4 text-center">Độ khó</th>
              <th class="p-4 text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            
            <tr v-if="filteredQuestions.length === 0">
              <td colspan="5" class="p-8 text-center text-slate-400">
                Không tìm thấy câu hỏi nào phù hợp với điều kiện tìm kiếm.
              </td>
            </tr>

            <tr
              v-for="(q, index) in filteredQuestions"
              :key="q.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- STT -->
              <td class="p-4 text-center font-semibold text-slate-500 text-xs">
                {{ index + 1 }}
              </td>

              <!-- Content -->
              <td class="p-4">
                <p class="font-bold text-slate-800 text-sm leading-snug">
                  {{ q.content }}
                </p>
              </td>

              <!-- Answers -->
              <td class="p-4 space-y-1">
                <div
                  v-for="(opt, oIdx) in q.options"
                  :key="oIdx"
                  :class="[
                    'text-xs p-1.5 rounded-lg border flex items-center space-x-2',
                    oIdx === q.correctAnswerIndex
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  ]"
                >
                  <span
                    :class="[
                      'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      oIdx === q.correctAnswerIndex
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    ]"
                  >
                    {{ getOptionLabel(oIdx) }}
                  </span>
                  <span class="line-clamp-1">{{ opt }}</span>
                </div>
              </td>

              <!-- Difficulty Badge -->
              <td class="p-4 text-center">
                <span
                  :class="[
                    'px-2.5 py-1 text-[11px] font-bold rounded-full border uppercase tracking-wider inline-block',
                    getDifficultyBadgeClass(q.difficulty)
                  ]"
                >
                  {{ getDifficultyLabel(q.difficulty) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="p-4 text-center">
                <div class="flex items-center justify-center space-x-1">
                  <!-- Edit Button -->
                  <button
                    @click="handleEditQuestion(q)"
                    class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Chỉnh sửa câu hỏi"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete Button -->
                  <button
                    @click="handleDeleteQuestion(q.id)"
                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Xóa câu hỏi"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

interface QuestionItem {
  id: string | number
  content: string
  options: string[]
  correctAnswerIndex: number
  difficulty: Difficulty
}

const router = useRouter()
const route = useRoute()

const isRefreshing = ref(false)

// Header Details
const bankDetails = ref({
  uuid: route.params.uuid || 'qb-uuid-123456',
  title: 'Ngân hàng câu hỏi Triết học Mác - Lênin 2026',
  subjectName: 'Triết học Mác - Lênin',
  createdAt: '15/08/2026'
})

// Search State (Separate inputs from applied query)
const inputContent = ref('')
const inputDifficulty = ref<'ALL' | Difficulty>('ALL')

const appliedContent = ref('')
const appliedDifficulty = ref<'ALL' | Difficulty>('ALL')

// Mock Questions List
const questions = ref<QuestionItem[]>([
  {
    id: 101,
    content: 'Chủ nghĩa duy vật biện chứng do ai sáng lập?',
    options: ['C. Mác và Ph. Ăng-ghen', 'V.I. Lênin', 'G.W.F. Hêghen', 'L. Phoi-ơ-bắc'],
    correctAnswerIndex: 0,
    difficulty: 'EASY'
  },
  {
    id: 102,
    content: 'Quy luật nào vạch ra phương thức của sự phát triển trong triết học Mác - Lênin?',
    options: [
      'Quy luật mâu thuẫn',
      'Quy luật chuyển hóa từ những thay đổi về lượng thành những thay đổi về chất',
      'Quy luật phủ định của phủ định',
      'Quy luật quan hệ sản xuất'
    ],
    correctAnswerIndex: 1,
    difficulty: 'MEDIUM'
  },
  {
    id: 103,
    content: 'Thực tiễn bao gồm những hình thức hoạt động cơ bản nào?',
    options: [
      'Hoạt động sản xuất vật chất, hoạt động chính trị - xã hội, hoạt động thực nghiệm khoa học',
      'Hoạt động tư duy và nhận thức cảm tính',
      'Hoạt động quan sát tự nhiên và thí nghiệm',
      'Hoạt động sáng tạo nghệ thuật và giáo dục'
    ],
    correctAnswerIndex: 0,
    difficulty: 'HARD'
  }
])

// Metrics calculation
const metrics = computed(() => {
  const total = questions.value.length
  const easy = questions.value.filter(q => q.difficulty === 'EASY').length
  const medium = questions.value.filter(q => q.difficulty === 'MEDIUM').length
  const hard = questions.value.filter(q => q.difficulty === 'HARD').length
  return { total, easy, medium, hard }
})

// Filtered Questions based on APPLIED search state
const filteredQuestions = computed(() => {
  return questions.value.filter(q => {
    const matchesContent = !appliedContent.value.trim() ||
      q.content.toLowerCase().includes(appliedContent.value.toLowerCase().trim())
    
    const matchesDifficulty = appliedDifficulty.value === 'ALL' ||
      q.difficulty === appliedDifficulty.value

    return matchesContent && matchesDifficulty
  })
})

// Trigger search on Enter or Button Click
const triggerSearch = () => {
  appliedContent.value = inputContent.value
  appliedDifficulty.value = inputDifficulty.value
}

const resetSearch = () => {
  inputContent.value = ''
  inputDifficulty.value = 'ALL'
  appliedContent.value = ''
  appliedDifficulty.value = 'ALL'
}

const goBack = () => {
  router.push({ name: 'TeacherQuestionBank' })
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await new Promise(resolve => setTimeout(resolve, 600))
  isRefreshing.value = false
}

const handleExport = () => {
  console.log('Exporting question bank:', bankDetails.value.title)
  alert(`Bắt đầu tải file xuất cho "${bankDetails.value.title}"`)
}

// Chuyển hướng tạo câu hỏi mới
const handleCreateQuestion = () => {
  const bankUuid = route.params.uuid || bankDetails.value.uuid
  router.push({
    name: 'TeacherCreateQuestion',
    params: { uuid: bankUuid }
  })
}

// Chuyển hướng sửa câu hỏi
const handleEditQuestion = (q: QuestionItem) => {
  const bankUuid = route.params.uuid || bankDetails.value.uuid
  router.push({
    name: 'TeacherEditQuestion',
    params: { 
      uuid: bankUuid,
      questionId: q.id 
    }
  })
}

const handleDeleteQuestion = (id: string | number) => {
  if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng?')) {
    questions.value = questions.value.filter(q => q.id !== id)
  }
}

const getOptionLabel = (idx: number) => {
  return ['A', 'B', 'C', 'D', 'E'][idx] || `${idx + 1}`
}

const getDifficultyLabel = (diff: Difficulty) => {
  switch (diff) {
    case 'EASY': return 'Dễ'
    case 'MEDIUM': return 'Trung bình'
    case 'HARD': return 'Khó'
  }
}

const getDifficultyBadgeClass = (diff: Difficulty) => {
  switch (diff) {
    case 'EASY': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'HARD': return 'bg-red-50 text-red-700 border-red-200'
  }
}
</script>