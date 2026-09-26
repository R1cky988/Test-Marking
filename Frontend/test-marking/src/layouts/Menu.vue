<template>
  <aside 
    :class="[
      'bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 ease-in-out h-screen sticky top-0',
      isCollapsed ? 'w-20' : 'w-64'
    ]"
  >
    <!-- Top Section: Logo, Title & Minimize Toggle -->
    <div>
      <div class="h-16 border-b border-slate-200 flex items-center justify-between px-4">
        <!-- Logo & Title -->
        <div v-if="!isCollapsed" class="flex items-center space-x-3 overflow-hidden">
          <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
            TM
          </div>
          <span class="font-bold text-lg text-slate-800 tracking-tight whitespace-nowrap">
            TestMarking
          </span>
        </div>
        
        <div v-else class="mx-auto">
          <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            TM
          </div>
        </div>

        <!-- Toggle Collapse Button -->
        <button 
          @click="toggleSidebar"
          class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none"
          :title="isCollapsed ? 'Mở rộng' : 'Thu gọn'"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="!isCollapsed" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Navigation Menu -->
      <nav class="p-3 space-y-1">
        <a
          v-for="item in menuItems"
          :key="item.name"
          href="#"
          :class="[
            'flex items-center px-3 py-2.5 rounded-lg font-medium text-sm transition-colors group',
            item.active 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          ]"
          :title="isCollapsed ? item.name : ''"
        >
          <!-- Icon -->
          <component 
            :is="item.icon" 
            :class="[
              'w-5 h-5 flex-shrink-0 transition-colors',
              item.active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600',
              isCollapsed ? 'mx-auto' : 'mr-3'
            ]" 
          />
          
          <span v-if="!isCollapsed" class="whitespace-nowrap">{{ item.name }}</span>
        </a>
      </nav>
    </div>

    <!-- Sidebar Footer -->
    <div class="p-4 border-t border-slate-200">
      <div v-if="!isCollapsed" class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-slate-800">Cài đặt ngay</h4>
          <p class="text-xs text-slate-400">Tải bản cập nhật mới</p>
        </div>
        <button 
          @click="onInstallClick"
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors shadow-sm"
        >
          Cài đặt
        </button>
      </div>

      <!-- Compact view for collapsed state -->
      <div v-else class="flex justify-center">
        <button 
          @click="onInstallClick"
          class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          title="Cài đặt ngay"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, markRaw, type Component } from 'vue'

interface MenuItem {
  name: string
  icon: Component
  active: boolean
}

const isCollapsed = ref<boolean>(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const onInstallClick = () => {
  console.log('Route to installation or app download')
}


const IconClass = markRaw({
  template: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
})

const IconExam = markRaw({
  template: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`
})

const IconQuestionBank = markRaw({
  template: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 20h8M8 4h8m-4 0v16m-4-8h8"/></svg>`
})

const IconTemplate = markRaw({
  template: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>`
})

const menuItems = ref<MenuItem[]>([
  { name: 'Lớp học', icon: IconClass, active: false },
  { name: 'Kỳ thi', icon: IconExam, active: false },
  { name: 'Ngân hàng câu hỏi', icon: IconQuestionBank, active: false },
  { name: 'Mẫu phiếu', icon: IconTemplate, active: false },
])
</script>