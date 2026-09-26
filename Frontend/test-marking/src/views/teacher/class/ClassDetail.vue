<template>
  <div class="max-w-7xl mx-auto space-y-6 pb-12">
    <!-- Back Navigation & Title Bar -->
    <div class="flex items-center justify-between border-b border-slate-200 pb-4">
      <div>
        <button
          @click="goBack"
          class="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-1 cursor-pointer"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Quay lại danh sách lớp học</span>
        </button>
        
        <div class="flex items-center space-x-3">
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">{{ classDetail.name }}</h1>
          <!-- Class Code Badge -->
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
            Mã môn: {{ classDetail.classCode }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-2">
        <!-- NEW: Get Join Class Code Button -->
        <button
          @click="handleCopyJoinCode"
          class="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition flex items-center space-x-1.5 cursor-pointer"
        >
          <svg v-if="!copied" class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
          </svg>
          <svg v-else class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ copied ? 'Đã chép: ' + classDetail.joinClassCode : 'Mã tham gia lớp' }}</span>
        </button>

        <!-- Edit Class Info Button -->
        <button
          @click="handleEditClass"
          class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
        >
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Sửa thông tin lớp</span>
        </button>
      </div>
    </div>

    <!-- PART 1: Upcoming Examinations Section -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 class="text-base font-bold text-slate-800 flex items-center space-x-2">
            <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Kỳ thi sắp diễn ra ({{ upcomingExams.length }})</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Danh sách các kỳ thi scheduled cho lớp học này</p>
        </div>

        <button
          @click="handleCreateExamForClass"
          class="text-xs font-bold text-blue-600 hover:text-blue-700 transition flex items-center space-x-1 cursor-pointer"
        >
          <span>+ Tạo kỳ thi mới</span>
        </button>
      </div>

      <!-- Upcoming Exam Cards Grid -->
      <div v-if="upcomingExams.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        <div
          v-for="exam in upcomingExams"
          :key="exam.id"
          class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
              Sắp diễn ra
            </span>
            <span class="text-[11px] font-medium text-slate-400">{{ exam.startTime }}</span>
          </div>

          <h3 class="font-bold text-slate-800 text-sm line-clamp-1">{{ exam.name }}</h3>

          <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
            <span>Thời lượng: <strong class="text-slate-700">{{ exam.durationMinutes }} phút</strong></span>
          </div>
        </div>
      </div>

      <p v-else class="text-xs text-slate-400 italic text-center py-4">Chưa có kỳ thi nào sắp diễn ra.</p>
    </div>

    <!-- PART 2: Student Roster List -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <!-- Roster Header & Search/Add Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-800 flex items-center space-x-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Danh sách sinh viên ({{ students.length }})</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Quản lý thành viên đang tham gia lớp học</p>
        </div>

        <div class="flex items-center space-x-3">
          <!-- Search Input -->
          <div class="relative">
            <input
              v-model="studentSearchQuery"
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              class="w-48 sm:w-64 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- Add Student Button -->
          <button
            @click="handleAddStudent"
            class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition shadow-sm flex items-center space-x-1 shrink-0 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Thêm sinh viên</span>
          </button>
        </div>
      </div>

      <!-- Students Table -->
      <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th class="p-3.5 w-14 text-center">STT</th>
              <th class="p-3.5">Họ và tên</th>
              <th class="p-3.5">Địa chỉ Email</th>
              <th class="p-3.5 w-36 text-center">Ngày tham gia</th>
              <th class="p-3.5 w-24 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(st, idx) in filteredStudents"
              :key="st.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- STT -->
              <td class="p-3.5 text-center font-bold text-slate-400">{{ idx + 1 }}</td>

              <!-- Name & Initial Avatar -->
              <td class="p-3.5 font-bold text-slate-800">
                <div class="flex items-center space-x-2.5">
                  <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center uppercase shrink-0">
                    {{ st.name.slice(0, 2) }}
                  </div>
                  <span>{{ st.name }}</span>
                </div>
              </td>

              <!-- Email -->
              <td class="p-3.5 text-slate-600 font-medium">{{ st.email }}</td>

              <!-- Join Date -->
              <td class="p-3.5 text-center text-slate-500">{{ st.joinDate }}</td>

              <!-- Kick / Remove Action Button -->
              <td class="p-3.5 text-center">
                <button
                  @click="handleKickStudent(st)"
                  class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Xóa khỏi lớp"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty Filter State -->
        <div v-if="filteredStudents.length === 0" class="p-8 text-center text-slate-400">
          Không tìm thấy sinh viên nào trong lớp.
        </div>
      </div>
    </div>
  </div>
  <CreateExamination
  :is-open="isCreateExaminationModalOpen"
  @close="isCreateExaminationModalOpen = false"
  @save="isCreateExaminationModalOpen = false"></CreateExamination>

  <EditClassModal
  :is-open="isEditClassModalOpen"
  :class-data="classDetail"
  @close="isEditClassModalOpen = false"></EditClassModal>

  <AddStudentModal
  :is-open="isAddStudentModalOpen"
  @close="isAddStudentModalOpen = false"
  @add=""></AddStudentModal>
</template>

<script setup lang="ts">
import AddStudentModal from '@/components/AddStudentModal.vue'
import CreateExamination from '@/components/CreateExamination.vue'
import EditClassModal from '@/components/EditClassModal.vue'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface Student {
  id: string | number
  name: string
  email: string
  joinDate: string
}

interface UpcomingExam {
  id: string | number
  name: string
  startTime: string
  durationMinutes: number
}

const router = useRouter()
const isCreateExaminationModalOpen = ref(false)
const isEditClassModalOpen = ref(false)
const isAddStudentModalOpen = ref(false)
// Class Detail State
const classDetail = ref({
  id: 'c1',
  name: 'Hệ Nhúng',
  classCode: 'IT4409',
  subjectCode: 'IT4409',
  joinClassCode: 'JOIN-982A4X'
})

// Upcoming Exams Data
const upcomingExams = ref<UpcomingExam[]>([
  { id: 201, name: 'Thi Cuối Kỳ Hệ Nhúng STM32', startTime: '15/10/2026 08:00', durationMinutes: 60 },
  { id: 202, name: 'Kiểm tra 15 phút Kiến trúc ARM', startTime: '22/10/2026 09:30', durationMinutes: 15 }
])

// Student Search Filter
const studentSearchQuery = ref('')
const copied = ref(false)
// Student Roster Data
const students = ref<Student[]>([
  { id: 1, name: 'Nguyễn Văn A', email: 'a.nv261234@hust.edu.vn', joinDate: '01/09/2026' },
  { id: 2, name: 'Trần Thị B', email: 'b.tt265678@hust.edu.vn', joinDate: '01/09/2026' },
  { id: 3, name: 'Lê Hoàng C', email: 'c.lh269012@hust.edu.vn', joinDate: '03/09/2026' },
  { id: 4, name: 'Phạm Minh D', email: 'd.pm263456@hust.edu.vn', joinDate: '05/09/2026' }
])
const handleCopyJoinCode = async () => {
  try {
    await navigator.clipboard.writeText(classDetail.value.joinClassCode)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch (err) {
    alert(`Mã tham gia lớp: ${classDetail.value.joinClassCode}`)
  }
}
// Computed Filtered Student List
const filteredStudents = computed(() => {
  const q = studentSearchQuery.value.toLowerCase().trim()
  if (!q) return students.value

  return students.value.filter(
    st => st.name.toLowerCase().includes(q) || st.email.toLowerCase().includes(q)
  )
})

const goBack = () => {
  router.push({ name: 'TeacherClasses' })
}

const handleEditClass = () => {
  console.log('Edit class info modal')
  isEditClassModalOpen.value = true
}

const handleCreateExamForClass = () => {
  console.log('Redirect to create exam modal/page pre-selecting this class')
  isCreateExaminationModalOpen.value = true
}

const goToExamDetail = (id: string | number) => {
  router.push({ name: 'TeacherExamDetail', params: { uuid: id } })
}

const handleAddStudent = () => {
  console.log('Open Add / Import Student Modal')
  isAddStudentModalOpen.value = true
}

const handleKickStudent = (student: Student) => {
  if (confirm(`Bạn có chắc chắn muốn xóa sinh viên "${student.name}" khỏi lớp học này?`)) {
    students.value = students.value.filter(s => s.id !== student.id)
  }
}
</script>