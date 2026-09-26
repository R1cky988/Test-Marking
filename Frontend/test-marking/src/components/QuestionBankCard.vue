<template>
  <div
    @click="handleRouteDetail"
    class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative cursor-pointer group"
  >
    
    <!-- Header: Title & Dropdown Action Menu -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center space-x-2 mb-1">
          <!-- Status Badge -->
          <span 
            :class="[
              'px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider',
              item.isPublic 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            ]"
          >
            {{ item.isPublic ? 'Công khai' : 'Riêng tư' }}
          </span>

          <span class="text-xs text-slate-400 font-medium">
            {{ item.questionCount }} câu hỏi
          </span>
        </div>

        <h3 class="font-bold text-slate-800 text-base leading-snug line-clamp-2 group-hover:text-blue-600 group-hover:underline transition-colors">
          {{ item.title }}
        </h3>
      </div>

      <!-- Action Dropdown Container -->
      <div class="relative shrink-0" ref="dropdownRef" @click.stop>
        <button
          @click="isMenuOpen = !isMenuOpen"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title="Tùy chọn"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <Transition name="fade-fast">
          <div
            v-if="isMenuOpen"
            class="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs"
          >
            <!-- Share Option -->
            <button
              @click="handleShare"
              class="w-full px-3.5 py-2.5 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2 transition cursor-pointer"
            >
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Chia sẻ ngân hàng</span>
            </button>

            <!-- Delete Option -->
            <button
              @click="handleDelete"
              class="w-full px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2 transition cursor-pointer"
            >
              <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Xóa ngân hàng</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Description / Subject Details -->
    <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
      {{ item.description || 'Không có mô tả bổ sung cho ngân hàng câu hỏi này.' }}
    </p>

    <!-- Tags List -->
    <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1.5 pt-1">
      <span
        v-for="tag in item.tags"
        :key="tag"
        @click.stop="$emit('select-tag', tag)"
        class="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[11px] font-medium rounded-md cursor-pointer transition"
      >
        #{{ tag }}
      </span>
    </div>

    <!-- Footer: Created Date -->
    <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
      <span class="flex items-center space-x-1">
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Tạo: {{ item.createdAt }}</span>
      </span>

      <span class="text-slate-500 font-medium">
        {{ item.subjectName }}
      </span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useRouter } from 'vue-router'

export interface QuestionBankItem {
  id: string | number
  title: string
  description?: string
  subjectName: string
  questionCount: number
  isPublic: boolean
  tags: string[]
  createdAt: string
}

const props = defineProps<{
  item: QuestionBankItem
}>()

const router = useRouter()

const emit = defineEmits<{
  (e: 'share', item: QuestionBankItem): void
  (e: 'delete', id: string | number): void
  (e: 'select-tag', tag: string): void
}>()

const isMenuOpen = ref(false)
const dropdownRef = useTemplateRef('dropdownRef')

onClickOutside(dropdownRef, () => {
  isMenuOpen.value = false
})

const handleShare = () => {
  isMenuOpen.value = false
  emit('share', props.item)
}

const handleDelete = () => {
  isMenuOpen.value = false
  emit('delete', props.item.id)
}

const handleRouteDetail = () => {
  router.push({ name: 'TeacherQuestionBankDetail', params: { uuid: String(props.item.id) } })
}
</script>

<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>