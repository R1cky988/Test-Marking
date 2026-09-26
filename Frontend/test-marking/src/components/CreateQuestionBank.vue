<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm outline-none"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Modal Header -->
        <div class="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <h3 class="font-bold text-base">Tạo Ngân Hàng Câu Hỏi Mới</h3>
          <button @click="closeModal" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4 overflow-y-auto flex-1">
          <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center">
            <svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tên ngân hàng câu hỏi <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="Ví dụ: Triết học Mác - Lênin 2026"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <!-- Subject Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tên môn học <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.subjectName"
              type="text"
              required
              placeholder="Ví dụ: Triết học Mác - Lênin"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả chi tiết
            </label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Nhập mô tả ngắn gọn về bộ câu hỏi này..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition resize-none"
            ></textarea>
          </div>

          <!-- Question Count & Visibility -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Số lượng câu hỏi
              </label>
              <input
                v-model.number="form.questionCount"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Quyền truy cập
              </label>
              <button
                type="button"
                @click="form.isPublic = !form.isPublic"
                :class="[
                  'w-full py-2.5 px-3 rounded-xl text-xs font-bold transition border flex items-center justify-center space-x-2',
                  form.isPublic ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                ]"
              >
                <span class="w-2 h-2 rounded-full" :class="form.isPublic ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                <span>{{ form.isPublic ? 'Công Khai (Public)' : 'Riêng Tư (Private)' }}</span>
              </button>
            </div>
          </div>

          <!-- Hybrid Tag System -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Thẻ Tag
            </label>

            <!-- Active Selected Tag Chips -->
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 min-h-[44px] focus-within:ring-2 focus-within:ring-blue-600 focus-within:bg-white transition mb-2">
              <span
                v-for="(tag, index) in form.tags"
                :key="index"
                class="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold"
              >
                #{{ tag }}
                <button type="button" @click="removeTag(index)" class="ml-1.5 text-blue-500 hover:text-blue-800 font-bold">
                  ×
                </button>
              </span>

              <input
                v-model="tagInput"
                @keydown.enter.prevent="addCustomTag"
                @keydown="handleTagKeydown"
                type="text"
                placeholder="Tự nhập tag mới..."
                class="flex-1 min-w-[120px] bg-transparent text-xs text-slate-800 focus:outline-none py-0.5"
              />
            </div>

            <!-- Pre-defined Suggested Quick Tags -->
            <div>
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Gợi ý thẻ tag phổ biến:
              </span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="suggestedTag in suggestedTags"
                  :key="suggestedTag"
                  type="button"
                  @click="toggleSuggestedTag(suggestedTag)"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                    form.tags.includes(suggestedTag)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  ]"
                >
                  + {{ suggestedTag }}
                </button>
              </div>
            </div>
          </div>
        </form>

        <!-- Footer Actions -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button type="button" @click="closeModal" class="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition">
            Hủy Bỏ
          </button>
          <button type="button" @click="handleSubmit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Tạo Ngân Hàng</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'create'])

const suggestedTags = ref(['GiữaKỳ', 'CuốiKỳ', 'LýThuyết', 'BàiTập', 'HUST', 'TrắcNghiệm', 'Toán', 'Văn', 'Tiếng Anh'])

const form = ref({
  title: '',
  description: '',
  subjectName: '',
  questionCount: 0,
  isPublic: true,
  tags: [] as string[]
})

const tagInput = ref('')
const errorMessage = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      form.value = {
        title: '',
        description: '',
        subjectName: '',
        questionCount: 0,
        isPublic: true,
        tags: []
      }
      tagInput.value = ''
      errorMessage.value = ''
    }
  }
)

const addCustomTag = () => {
  const raw = tagInput.value.trim().replace(/^#/, '')
  if (raw && !form.value.tags.includes(raw)) {
    form.value.tags.push(raw)
  }
  tagInput.value = ''
}

const handleTagKeydown = (e: KeyboardEvent) => {
  if (e.key === ',') {
    e.preventDefault()
    addCustomTag()
  }
}

const toggleSuggestedTag = (tag: string) => {
  if (form.value.tags.includes(tag)) {
    form.value.tags = form.value.tags.filter(t => t !== tag)
  } else {
    form.value.tags.push(tag)
  }
}

const removeTag = (index: number) => {
  form.value.tags.splice(index, 1)
}

const handleSubmit = () => {
  errorMessage.value = ''

  if (tagInput.value.trim()) {
    addCustomTag()
  }

  if (!form.value.title.trim()) {
    errorMessage.value = 'Vui lòng nhập tên ngân hàng câu hỏi.'
    return
  }

  if (!form.value.subjectName.trim()) {
    errorMessage.value = 'Vui lòng nhập tên môn học.'
    return
  }

  emit('create', {
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    subjectName: form.value.subjectName.trim(),
    questionCount: form.value.questionCount || 0,
    isPublic: form.value.isPublic,
    tags: form.value.tags
  })

  closeModal()
}

const closeModal = () => {
  emit('close')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>