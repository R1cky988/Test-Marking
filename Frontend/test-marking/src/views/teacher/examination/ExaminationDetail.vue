<template>
  <div class="max-w-7xl mx-auto space-y-6 pb-12">
    <!-- Navigation Header -->
    <div class="flex items-center justify-between border-b border-slate-200 pb-4">
      <div>
        <button
          @click="goBack"
          class="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-1 cursor-pointer"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Quay lại danh sách kỳ thi</span>
        </button>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">
          {{ examDetail.name }}
        </h1>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-2">
        <button
          @click="handleExportReport"
          class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition flex items-center space-x-1.5"
        >
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Xuất báo cáo</span>
        </button>
      </div>
    </div>

    <!-- PART 1: General Information & Core Statistics Combined Card -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      
      <!-- Section A: Meta Info Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-slate-100 pb-6">
        <div>
          <span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Môn học</span>
          <span class="text-sm font-semibold text-slate-800">{{ examDetail.subject }}</span>
        </div>
        <div>
          <span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lớp học</span>
          <span class="text-sm font-semibold text-slate-800">{{ examDetail.className }}</span>
        </div>
        <div>
          <span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hình thức</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100">
            {{ examDetail.type === 'OFFLINE_GRADING' ? 'Chấm Offline' : 'Nộp Online' }}
          </span>
        </div>
        <div>
          <span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</span>
          <span
            :class="[
              'text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border inline-block mt-0.5',
              getStatusBadgeClass(examDetail.status)
            ]"
          >
            {{ getStatusLabel(examDetail.status) }}
          </span>
        </div>
        <div>
          <span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ngày tạo</span>
          <span class="text-sm font-semibold text-slate-700">{{ examDetail.createdAt }}</span>
        </div>
        <div>
          <span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thời gian diễn ra</span>
          <span class="text-xs font-medium text-slate-600 block">{{ examDetail.startTime }}</span>
          <span class="text-xs font-medium text-slate-400 block">đến {{ examDetail.endTime }}</span>
        </div>
      </div>

      <!-- Section B: Core Statistics Metrics -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Submissions / Class size -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số bài nộp / Tỉ lệ</p>
          <div class="flex items-baseline space-x-1 mt-1">
            <span class="text-2xl font-bold text-blue-600">{{ examDetail.submittedCount }}</span>
            <span class="text-sm font-semibold text-slate-400">/ {{ examDetail.totalStudents }} HS</span>
          </div>
          <p class="text-[11px] text-slate-500 mt-1">
            Đã nộp: <b>{{ Math.round((examDetail.submittedCount / examDetail.totalStudents) * 100) }}%</b>
          </p>
        </div>

        <!-- Highest Score -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Điểm cao nhất</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ examDetail.maxScore }} <span class="text-xs font-normal text-slate-400">/10</span></p>
          <p class="text-[11px] text-slate-500 mt-1">Điểm Min: <b>{{ examDetail.minScore }}</b></p>
        </div>

        <!-- Average Score -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Điểm trung bình</p>
          <p class="text-2xl font-bold text-amber-600 mt-1">{{ examDetail.avgScore }}</p>
          <p class="text-[11px] text-slate-500 mt-1">Trung bình toàn bộ lớp</p>
        </div>

        <!-- Pass Rate >= 50% -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tỉ lệ Đạt (≥ 50%)</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ examDetail.aboveHalfPercentage }}%</p>
          <p class="text-[11px] text-slate-500 mt-1">
            Tương đương: <b>{{ Math.round((examDetail.submittedCount * examDetail.aboveHalfPercentage) / 100) }} bài</b>
          </p>
        </div>

        <!-- Fail Rate < 50% -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tỉ lệ Chưa Đạt (&lt; 50%)</p>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ examDetail.belowHalfPercentage }}%</p>
          <p class="text-[11px] text-slate-500 mt-1">
            Tương đương: <b>{{ Math.round((examDetail.submittedCount * examDetail.belowHalfPercentage) / 100) }} bài</b>
          </p>
        </div>
      </div>

    </div>

    <!-- PART 2: Score Distribution (Phổ điểm) -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 class="text-base font-bold text-slate-800">Phổ điểm bài thi</h2>
        </div>
      </div>

      <!-- Visual Bar Chart Representation -->
      <div class="grid grid-cols-5 gap-3 pt-4 items-end min-h-[180px]">
        <div
          v-for="bar in scoreDistribution"
          :key="bar.range"
          class="flex flex-col items-center h-full justify-end group"
        >
          <!-- Count badge -->
          <span class="text-xs font-bold text-slate-700 mb-1 opacity-80 group-hover:opacity-100">
            {{ bar.count }} bài
          </span>

          <!-- Bar column -->
          <div class="w-full max-w-[64px] bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-32 p-1">
            <div
              :style="{ height: `${(bar.count / maxDistributionCount) * 100}%` }"
              :class="[
                'w-full rounded-t-lg transition-all duration-500',
                bar.colorClass
              ]"
            ></div>
          </div>

          <!-- Range Label -->
          <span class="text-xs font-bold text-slate-600 mt-2">{{ bar.range }}</span>
        </div>
      </div>
    </div>

    <!-- PART 3: Code Breakdown & Question Analysis Table -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      
      <!-- Test Code Tab Selector -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-800">Phân tích chi tiết câu hỏi theo mã đề</h2>
          <p class="text-xs text-slate-400">Thống kê đáp án đúng và phân bố lựa chọn của sinh viên</p>
        </div>

        <!-- Code Selectors -->
        <div class="flex items-center space-x-2 overflow-x-auto">
          <button
            v-for="code in availableCodes"
            :key="code"
            @click="selectedCode = code"
            :class="[
              'px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer',
              selectedCode === code
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            ]"
          >
            Mã đề {{ code }}
          </button>
        </div>
      </div>

      <!-- Balanced Table Layout -->
      <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[800px] text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th class="p-3.5 w-[8%] text-center">STT</th>
              <th class="p-3.5 w-[14%] text-center">Đáp án đúng</th>
              <th class="p-3.5 w-[18%] text-center">Tỉ lệ làm đúng</th>
              <th class="p-3.5 w-[18%] text-center">Số bài làm đúng</th>
              <th class="p-3.5 w-[42%] text-center">Phân bố lựa chọn (A / B / C / D / E)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(q, idx) in currentCodeAnalysis"
              :key="q.stt"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- STT -->
              <td class="p-3.5 text-center font-bold text-slate-500">{{ idx + 1 }}</td>

              <!-- Correct Answer Badge -->
              <td class="p-3.5 text-center">
                <span class="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">
                  {{ q.correctOption }}
                </span>
              </td>

              <!-- Correct Percentage Progress Bar -->
              <td class="p-3.5 text-center">
                <div class="flex flex-col items-center space-y-1">
                  <span
                    :class="[
                      'font-bold text-xs',
                      q.correctPercentage >= 70
                        ? 'text-emerald-600'
                        : q.correctPercentage >= 40
                        ? 'text-amber-600'
                        : 'text-red-600'
                    ]"
                  >
                    {{ q.correctPercentage }}%
                  </span>
                  <div class="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      :style="{ width: `${q.correctPercentage}%` }"
                      :class="[
                        'h-full rounded-full transition-all duration-300',
                        q.correctPercentage >= 70
                          ? 'bg-emerald-500'
                          : q.correctPercentage >= 40
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      ]"
                    ></div>
                  </div>
                </div>
              </td>

              <!-- Correct Count -->
              <td class="p-3.5 text-center font-semibold text-slate-700">
                <span class="text-sm font-bold text-slate-800">{{ q.correctSubmissionsCount }}</span>
                <span class="text-slate-400"> / {{ examDetail.submittedCount }} bài</span>
              </td>

              <!-- Balanced Choice Distribution Grid -->
              <td class="p-3.5">
                <div class="grid grid-cols-5 gap-1.5 max-w-xs mx-auto">
                  <div
                    v-for="opt in ['A', 'B', 'C', 'D', 'E']"
                    :key="opt"
                    :class="[
                      'py-1 px-1.5 rounded-lg border text-center font-medium transition-all',
                      opt === q.correctOption
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold ring-1 ring-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    ]"
                  >
                    <span class="block text-[10px] text-slate-400 font-bold uppercase">{{ opt }}</span>
                    <span class="text-xs">{{ q.choiceCounts[opt] || 0 }}</span>
                  </div>
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
import { useRouter } from 'vue-router'

type ExamStatus = 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED'
type ExamType = 'OFFLINE_GRADING' | 'ONLINE_SUBMISSION'

interface QuestionAnalysis {
  stt: number
  correctOption: 'A' | 'B' | 'C' | 'D' | 'E'
  correctPercentage: number
  correctSubmissionsCount: number
  choiceCounts: Record<string, number>
}

const router = useRouter()

// Exam Information & Statistics Mock
const examDetail = ref({
  id: 101,
  name: 'Thi Giữa Kỳ Triết học Mác - Lênin 2026',
  subject: 'Triết học Mác - Lênin',
  className: 'IT4210E',
  type: 'OFFLINE_GRADING' as ExamType,
  status: 'ENDED' as ExamStatus,
  createdAt: '15/08/2026',
  startTime: '20/09/2026 08:00',
  endTime: '20/09/2026 09:30',
  submittedCount: 45,
  totalStudents: 50,
  maxScore: 9.6,
  minScore: 2.4,
  avgScore: 6.8,
  aboveHalfPercentage: 82, // >= 50%
  belowHalfPercentage: 18  // < 50%
})

// Score Distribution Ranges (0-2, 2-4, 4-6, 6-8, 8-10)
const scoreDistribution = ref([
  { range: '0 - 2', count: 1, colorClass: 'bg-red-500' },
  { range: '2 - 4', count: 7, colorClass: 'bg-amber-500' },
  { range: '4 - 6', count: 12, colorClass: 'bg-blue-500' },
  { range: '6 - 8', count: 18, colorClass: 'bg-indigo-500' },
  { range: '8 - 10', count: 7, colorClass: 'bg-emerald-500' }
])

const maxDistributionCount = computed(() => {
  return Math.max(...scoreDistribution.value.map(s => s.count), 1)
})

// Available Test Codes
const availableCodes = ref(['001', '002', '003', '004'])
const selectedCode = ref('001')

// Mock Data Analysis per Question for Selected Test Code
const codeAnalysisData = ref<Record<string, QuestionAnalysis[]>>({
  '001': [
    { stt: 1, correctOption: 'A', correctPercentage: 88, correctSubmissionsCount: 40, choiceCounts: { A: 40, B: 3, C: 1, D: 1, E: 0 } },
    { stt: 2, correctOption: 'C', correctPercentage: 62, correctSubmissionsCount: 28, choiceCounts: { A: 5, B: 8, C: 28, D: 4, E: 0 } },
    { stt: 3, correctOption: 'B', correctPercentage: 35, correctSubmissionsCount: 16, choiceCounts: { A: 12, B: 16, C: 10, D: 7, E: 0 } },
    { stt: 4, correctOption: 'D', correctPercentage: 93, correctSubmissionsCount: 42, choiceCounts: { A: 1, B: 1, C: 1, D: 42, E: 0 } }
  ],
  '002': [
    { stt: 1, correctOption: 'B', correctPercentage: 75, correctSubmissionsCount: 34, choiceCounts: { A: 4, B: 34, C: 5, D: 2, E: 0 } },
    { stt: 2, correctOption: 'D', correctPercentage: 50, correctSubmissionsCount: 22, choiceCounts: { A: 10, B: 8, C: 5, D: 22, E: 0 } }
  ]
})

const currentCodeAnalysis = computed(() => {
  return codeAnalysisData.value[selectedCode.value] || codeAnalysisData.value['001']
})

const goBack = () => {
  router.push({ name: 'TeacherExams' })
}

const handleExportReport = () => {
  alert(`Bắt đầu xuất file báo cáo chi tiết cho "${examDetail.value.name}"`)
}

const getStatusLabel = (status: ExamStatus) => {
  switch (status) {
    case 'UPCOMING': return 'Sắp diễn ra'
    case 'ONGOING': return 'Đang diễn ra'
    case 'ENDED': return 'Đã kết thúc'
    case 'CANCELLED': return 'Đã hủy'
  }
}

const getStatusBadgeClass = (status: ExamStatus) => {
  switch (status) {
    case 'UPCOMING': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'ONGOING': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'ENDED': return 'bg-slate-100 text-slate-600 border-slate-200'
    case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200'
  }
}
</script>