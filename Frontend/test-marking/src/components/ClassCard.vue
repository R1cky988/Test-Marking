<template>
  <div
    @click="$emit('click', classItem.id)"
    class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group relative cursor-pointer"
  >
    <!-- Left Section: Avatar & Details -->
    <div class="flex items-center space-x-4 min-w-0">
      <!-- 2-Letter Initials Avatar -->
      <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20 uppercase tracking-wider select-none">
        {{ avatarInitials }}
      </div>

      <!-- Class Name & Code -->
      <div class="space-y-1 min-w-0">
        <h3 class="font-bold text-slate-800 text-base truncate group-hover:text-blue-600 transition-colors">
          {{ classItem.name }}
        </h3>

        <div class="flex items-center space-x-2 text-xs text-slate-500">
          <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <span>Mã lớp: <strong class="text-slate-700 font-semibold">{{ classItem.code }}</strong></span>
        </div>
      </div>
    </div>

    <!-- Right Section: Action Dropdown Menu -->
    <!-- .stop modifier prevents clicks in this area from bubbling up to the card's navigation handler -->
    <div class="relative shrink-0" ref="dropdownRef" @click.stop>
      <button
        @click="isDropdownOpen = !isDropdownOpen"
        class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        title="Thao tác"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      <!-- Dropdown Popup -->
      <div
        v-if="isDropdownOpen"
        class="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 text-xs"
      >
        <button
          @click="handleEdit"
          class="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition font-medium cursor-pointer"
        >
          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Chỉnh sửa</span>
        </button>

        <button
          @click="handleDelete"
          class="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2 transition font-medium cursor-pointer"
        >
          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Xóa lớp</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export interface ClassItem {
  id: string | number
  name: string
  code: string
}

const props = defineProps<{
  classItem: ClassItem
}>()

const emit = defineEmits<{
  (e: 'edit', classItem: ClassItem): void
  (e: 'click', uuid: string | number): void
  (e: 'delete', id: string | number): void
}>()

const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// Generate 2-letter avatar initials from the class name
const avatarInitials = computed(() => {
  if (!props.classItem.name) return 'CL'
  const words = props.classItem.name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return props.classItem.name.slice(0, 2).toUpperCase()
})

const handleEdit = () => {
  isDropdownOpen.value = false
  emit('edit', props.classItem)
}

const handleDelete = () => {
  isDropdownOpen.value = false
  emit('delete', props.classItem.id)
}

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isDropdownOpen.value = false
  }
}

onMounted(() => window.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => window.removeEventListener('click', handleClickOutside))
</script>