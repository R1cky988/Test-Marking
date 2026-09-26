<template>
  <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
    <!-- Search Bar -->
    <div class="relative w-72 md:w-96">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Tìm kiếm bài thi, lớp học, câu hỏi..."
        class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        @keyup.enter="handleSearch"
      />
    </div>

    <!-- Login Button (Far Right) -->
    <div class="flex items-center space-x-4">
      <button 
        @click="onLoginClick"
        class="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Đăng nhập
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchQuery = ref<string>('')

const handleSearch = () => {
  console.log('Searching for:', searchQuery.value)
}

const onLoginClick = () => {
  console.log('Navigate to login page')
}
</script>