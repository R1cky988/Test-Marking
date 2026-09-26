<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-800">Thêm sinh viên vào lớp</h2>
            <p class="text-xs text-slate-400">Tìm kiếm sinh viên bằng địa chỉ email tài khoản</p>
          </div>
          <button
            @click="closeModal"
            class="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form & Search Body -->
        <div class="p-6 space-y-4">
          <!-- Search Input Bar -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Email sinh viên <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center space-x-2">
              <div class="relative flex-1">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  v-model="searchEmail"
                  @keyup.enter="handleSearchStudent"
                  type="email"
                  placeholder="Nhập email sinh viên..."
                  class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <button
                type="button"
                @click="handleSearchStudent"
                :disabled="isSearching || !searchEmail.trim()"
                class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-xs rounded-xl shadow-sm transition flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <svg
                  v-if="isSearching"
                  class="w-4 h-4 animate-spin text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ isSearching ? 'Đang tìm...' : 'Tìm' }}</span>
              </button>
            </div>
          </div>

          <!-- Alert / Status Messages -->
          <div
            v-if="errorMessage"
            class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2"
          >
            <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Found Student Card -->
          <div
            v-if="foundStudent"
            class="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 animate-fade-in"
          >
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 shadow-sm">
                {{ foundStudent.fullName.slice(0, 2) }}
              </div>
              <div class="space-y-0.5 min-w-0">
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm truncate">
                  {{ foundStudent.fullName }}
                </h4>
                <p class="text-[11px] text-slate-500 truncate">{{ foundStudent.email }}</p>
                <p v-if="foundStudent.studentCode" class="text-[10px] text-blue-600 font-semibold">
                  MSSV: {{ foundStudent.studentCode }}
                </p>
              </div>
            </div>

            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Hợp lệ
            </span>
          </div>
        </div>

        <!-- Actions Footer -->
        <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            @click="handleAddStudent"
            :disabled="!foundStudent || isSubmitting"
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <svg
              v-if="isSubmitting"
              class="w-3.5 h-3.5 animate-spin text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isSubmitting ? 'Đang thêm...' : 'Thêm vào lớp' }}</span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface StudentResult {
  id: string | number
  fullName: string
  email: string
  studentCode?: string
}

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', student: StudentResult): void
}>()

const searchEmail = ref('')
const isSearching = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const foundStudent = ref<StudentResult | null>(null)

// Email Regex Validation
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const handleSearchStudent = async () => {
  errorMessage.value = ''
  foundStudent.value = null

  const trimmedEmail = searchEmail.value.trim()

  if (!trimmedEmail) {
    errorMessage.value = 'Vui lòng nhập địa chỉ email.'
    return
  }

  if (!isValidEmail(trimmedEmail)) {
    errorMessage.value = 'Định dạng email không hợp lệ.'
    return
  }

  isSearching.value = true

  try {
    // MOCK API CALL - Thay thế bằng API call thực tế (VD: await api.getStudentByEmail(trimmedEmail))
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Mock kiểm tra sinh viên có tồn tại hay không
    if (trimmedEmail.includes('hust.edu.vn') || trimmedEmail.includes('gmail.com')) {
      foundStudent.value = {
        id: Math.floor(Math.random() * 1000),
        fullName: 'Nguyễn Văn Sinh Viên',
        email: trimmedEmail,
        studentCode: '20261234'
      }
    } else {
      errorMessage.value = 'Không tìm thấy sinh viên nào với email này trong hệ thống.'
    }
  } catch (err) {
    errorMessage.value = 'Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại.'
  } finally {
    isSearching.value = false
  }
}

const handleAddStudent = async () => {
  if (!foundStudent.value) return

  isSubmitting.value = true

  try {
    emit('add', foundStudent.value)
    closeModal()
  } catch (err) {
    errorMessage.value = 'Không thể thêm sinh viên vào lớp.'
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  searchEmail.value = ''
  errorMessage.value = ''
  foundStudent.value = null
  emit('close')
}
</script>