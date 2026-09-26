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
            <h2 class="text-base font-bold text-slate-800">Chỉnh sửa lớp học</h2>
            <p class="text-xs text-slate-400">Cập nhật thông tin cho lớp học hiện tại</p>
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

        <!-- Form Body -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <!-- Error Alert Banner -->
          <div
            v-if="errorMessage"
            class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2"
          >
            <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- 1. Class Name -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tên lớp học <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Ví dụ: Hệ Nhúng - K65..."
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <!-- 2. Class Code (Mã lớp học) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mã lớp học <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.classCode"
              type="text"
              placeholder="Ví dụ: 138902..."
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <!-- 3. Subject Code (Mã học phần / môn học) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mã môn học / học phần <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.subjectCode"
              type="text"
              placeholder="Ví dụ: IT4409..."
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition uppercase"
            />
          </div>

          <!-- Actions Footer -->
          <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
            >
              <svg
                v-if="isLoading"
                class="w-3.5 h-3.5 animate-spin text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ isLoading ? 'Đang lưu...' : 'Lưu thay đổi' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

export interface ClassData {
  id: string | number
  name: string
  classCode: string
  subjectCode: string
}

const props = defineProps<{
  isOpen: boolean
  classData: ClassData | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: ClassData): void
}>()

const form = ref({
  name: '',
  classCode: '',
  subjectCode: ''
})

const isLoading = ref(false)
const errorMessage = ref('')

// Populate form fields whenever classData changes or modal opens
watch(
  () => props.classData,
  (newData) => {
    if (newData) {
      form.value = {
        name: newData.name || '',
        classCode: newData.classCode || '',
        subjectCode: newData.subjectCode || ''
      }
    }
  },
  { immediate: true }
)

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!form.value.name.trim() || !form.value.classCode.trim() || !form.value.subjectCode.trim()) {
    errorMessage.value = 'Vui lòng nhập đầy đủ tất cả các trường bắt buộc (*).'
    return
  }

  if (!props.classData) {
    errorMessage.value = 'Không tìm thấy dữ liệu lớp học cần chỉnh sửa.'
    return
  }

  isLoading.value = true

  try {
    const updatedPayload: ClassData = {
      id: props.classData.id,
      name: form.value.name.trim(),
      classCode: form.value.classCode.trim(),
      subjectCode: form.value.subjectCode.trim().toUpperCase()
    }

    emit('save', updatedPayload)
    emit('close')
  } catch (err) {
    errorMessage.value = 'Đã xảy ra lỗi khi cập nhật lớp học. Vui lòng thử lại.'
  } finally {
    isLoading.value = false
  }
}

const closeModal = () => {
  errorMessage.value = ''
  emit('close')
}
</script>