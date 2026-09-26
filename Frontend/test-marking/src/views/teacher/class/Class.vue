<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Top Bar: Title & Create Class Action -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Lớp học</h1>

      <button
        @click="handleCreateClass"
        class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl transition shadow-md shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer shrink-0"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>Tạo lớp học</span>
      </button>
    </div>

    <!-- Search Bar Section -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <!-- Input Field -->
      <div class="md:col-span-9 relative space-y-1">
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Tìm kiếm lớp học</label>
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            v-model="inputQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Nhập tên lớp học hoặc mã lớp..."
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      <!-- Action Buttons (Search & Clear) -->
      <div class="md:col-span-3 flex items-center space-x-2">
        <button
          @click="handleSearch"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm py-2 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Tìm kiếm</span>
        </button>

        <button
          v-if="appliedQuery"
          @click="handleReset"
          class="p-2 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition cursor-pointer"
          title="Xóa tìm kiếm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Class List Grid -->
    <div v-if="filteredClasses.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ClassCard
        v-for="item in filteredClasses"
        :key="item.id"
        :class-item="item"
        @click="routeToClassDetail"
        @edit="handleEditClass"
        @delete="handleDeleteClass"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
      <svg class="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p class="text-sm font-medium text-slate-600">Không tìm thấy lớp học nào phù hợp.</p>
    </div>
  </div>
  <CreateClass
  :is-open="isCreateClassModalOpen"
  @close="isCreateClassModalOpen = false"
  @save="isCreateClassModalOpen = false"></CreateClass>
  
  <EditClassModal
  :is-open="isEditClassModalOpen"
  :class-data="editingClass ? {
    ...editingClass,
    classCode: editingClass.code,
    subjectCode: editingClass.code
  } : null"
  @close="isEditClassModalOpen = false"
  @save="isEditClassModalOpen = false"></EditClassModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ClassCard, { type ClassItem } from '@/components/ClassCard.vue'
import { useRouter } from 'vue-router'
import CreateClass from '@/components/CreateClass.vue'
import EditClassModal from '@/components/EditClassModal.vue'

// State
const inputQuery = ref('')
const appliedQuery = ref('')
const router = useRouter()
const isCreateClassModalOpen = ref(false)
const isEditClassModalOpen = ref(false)
const editingClass = ref<ClassItem | null>(null)

const classList = ref<ClassItem[]>([
  { id: 1, name: 'Hệ Nhúng', code: 'IT4409' },
  { id: 2, name: 'Triết học Mác-Lênin', code: 'IT4210E' },
  { id: 3, name: 'Thị giác máy tính', code: 'IT4800' },
  { id: 4, name: 'Phát triển ứng dụng di động', code: 'IT4501' },
  { id: 5, name: 'Lập trình Web Vue.js', code: 'IT3180' }
])

// Computed Filtered List
const filteredClasses = computed(() => {
  const q = appliedQuery.value.toLowerCase().trim()
  if (!q) return classList.value

  return classList.value.filter(item => 
    item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
  )
})

const handleSearch = () => {
  appliedQuery.value = inputQuery.value
}

const handleReset = () => {
  inputQuery.value = ''
  appliedQuery.value = ''
}

const handleCreateClass = () => {
  console.log('Open Create Class Modal')
  isCreateClassModalOpen.value = true
}

const handleEditClass = (classItem: ClassItem) => {
  console.log('Editing class:', classItem)
  editingClass.value = classItem
  isEditClassModalOpen.value = true;
}

const handleDeleteClass = (id: string | number) => {
  if (confirm('Bạn có chắc chắn muốn xóa lớp học này không?')) {
    classList.value = classList.value.filter(item => item.id !== id)
  }
}

const routeToClassDetail = (uuid: string | number) => {
  router.push({name: 'TeacherClassDetail', params: {uuid: String(uuid)}})
}
</script>