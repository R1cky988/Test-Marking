<template>
  <div
    @click="$emit('click', exam.id)"
    class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
  >
    <!-- Card Header: Subject Tag & Status Badge -->
    <div class="flex items-center justify-between gap-2">
      <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
        {{ exam.subject }}
      </span>

      <!-- Status Badge -->
      <span
        :class="[
          'px-2.5 py-0.5 text-[11px] font-bold rounded-full border uppercase tracking-wider shrink-0',
          getStatusBadgeClass(exam.status)
        ]"
      >
        {{ getStatusLabel(exam.status) }}
      </span>
    </div>

    <!-- Exam Info -->
    <div class="space-y-2.5">
      <!-- Exam Title -->
      <h3
        class="font-bold text-slate-800 text-base line-clamp-2 group-hover:text-blue-600 group-hover:underline transition-colors"
        title="Xem chi tiết kỳ thi"
      >
        {{ exam.name }}
      </h3>

      <div class="space-y-1.5 text-xs text-slate-500">
        <!-- Class Name -->
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Lớp học: <strong class="text-slate-700">{{ exam.className }}</strong></span>
        </div>

        <!-- Exam Type Tag -->
        <div class="flex items-center space-x-2">
          <svg
            v-if="exam.examType === 'OFFLINE_GRADING'"
            class="w-4 h-4 text-amber-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <svg
            v-else
            class="w-4 h-4 text-indigo-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>

          <span class="text-xs">
            Hình thức: 
            <span
              :class="[
                'font-semibold px-2 py-0.5 rounded-md text-[11px] inline-block ml-0.5',
                exam.examType === 'OFFLINE_GRADING'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              ]"
            >
              {{ getExamTypeLabel(exam.examType) }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- Action / Details Footer -->
    <div class="pt-3 border-t border-slate-100 flex items-center justify-end text-xs text-slate-400">
      <div class="text-blue-600 font-semibold group-hover:underline flex items-center space-x-1">
        <span>Chi tiết</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export type ExamStatus = 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED'
export type ExamType = 'OFFLINE_GRADING' | 'ONLINE_SUBMISSION'

export interface ExamItem {
  id: string | number
  name: string
  status: ExamStatus
  examType: ExamType
  subject: string
  className: string
  startDate?: string
  endDate?: string
}

defineProps<{
  exam: ExamItem
}>()

defineEmits<{
  (e: 'click', id: string | number): void
}>()

const getStatusLabel = (status: ExamStatus) => {
  switch (status) {
    case 'UPCOMING':
      return 'Sắp diễn ra'
    case 'ONGOING':
      return 'Đang diễn ra'
    case 'ENDED':
      return 'Đã kết thúc'
    case 'CANCELLED':
      return 'Đã hủy'
  }
}

const getExamTypeLabel = (type: ExamType) => {
  switch (type) {
    case 'OFFLINE_GRADING':
      return 'Chấm bài Offline (Giảng viên)'
    case 'ONLINE_SUBMISSION':
      return 'Nộp bài Online (Tự động chấm)'
  }
}

const getStatusBadgeClass = (status: ExamStatus) => {
  switch (status) {
    case 'UPCOMING':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'ONGOING':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
    case 'ENDED':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-200'
  }
}
</script>