<template>
  <div class="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
    <!-- Backdrop overlay for mobile screen view -->
    <Transition name="fade">
      <div
        v-if="isMobileOpen"
        @click="isMobileOpen = false"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
      ></div>
    </Transition>

    <!-- Sidebar Drawer -->
    <aside
      :class="[
        'bg-slate-900 text-white flex flex-col justify-between shadow-xl transition-all duration-300 z-50 fixed lg:static inset-y-0 left-0',
        isCollapsed ? 'lg:w-20' : 'lg:w-64',
        'w-64', // Mobile drawer width
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <div>
        <!-- Sidebar Header & Toggle Button -->
        <div class="h-16 flex items-center justify-between border-b border-slate-800 px-4">
          <!-- Logo & Branding Title -->
          <div v-show="!isCollapsed || isMobileOpen" class="flex items-center space-x-3 overflow-hidden">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm overflow-hidden">
                <img src="/icon.png" class="w-full h-full object-cover">
            </div>
            <h1 class="text-lg font-bold tracking-wide text-blue-400 truncate transition-opacity duration-200">
              TestMarking
            </h1>
          </div>

          <!-- Desktop Minimize Toggle Button -->
          <button
            @click="toggleSidebar"
            class="hidden lg:block p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            :title="isCollapsed ? 'Mở rộng' : 'Thu gọn'"
          >
            <svg
              class="w-5 h-5 transition-transform duration-300"
              :class="{ 'rotate-180': isCollapsed }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          <!-- Mobile Close Button -->
          <button
            @click="isMobileOpen = false"
            class="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav class="mt-6 px-3 space-y-1.5">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            @click="handleNavClick"
            class="flex items-center px-3.5 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors group relative"
            exact-active-class="bg-blue-600 text-white hover:bg-blue-600 font-medium"
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            
            <span
              v-show="!isCollapsed || isMobileOpen"
              class="ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-200"
            >
              {{ item.label }}
            </span>

            <div
              v-if="isCollapsed && !isMobileOpen"
              class="hidden lg:block absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
            >
              {{ item.label }}
            </div>
          </router-link>
        </nav>
      </div>

      <!-- Footer Section -->
      <div class="p-3 border-t border-slate-800">
        <div v-if="!isCollapsed || isMobileOpen" class="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-center justify-between">
          <div>
            <h4 class="text-xs font-semibold text-slate-200">Cài đặt ứng dụng</h4>
            <p class="text-[10px] text-slate-400">Tải bản Android / Offline</p>
          </div>
          <button 
            @click="onInstallClick"
            class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1.5 rounded transition-colors shadow-sm"
          >
            Tải
          </button>
        </div>

        <button
          v-else
          @click="onInstallClick"
          class="hidden lg:flex w-full items-center justify-center p-2 text-blue-400 hover:bg-slate-800 rounded-lg transition-colors group relative"
          title="Tải ứng dụng"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <div
            class="absolute left-full ml-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
          >
            Tải ứng dụng
          </div>
        </button>
      </div>
    </aside>

    <!-- Main Content Container -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
      <!-- Top Navbar / Header -->
      <header class="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10">
        <div class="flex items-center space-x-2 sm:space-x-4 flex-1">
          <!-- Mobile Menu Toggle Button -->
          <button
            @click="isMobileOpen = true"
            class="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
            aria-label="Open sidebar"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <!-- Responsive Search Input Bar -->
          <div class="relative w-full max-w-xs sm:max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              class="w-full pl-9 pr-3 sm:pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <!-- Right Header Options -->
        <div class="flex items-center space-x-2 sm:space-x-3 ml-2 flex-shrink-0">
          <span class="hidden sm:inline-block px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
            Giảng viên
          </span>

          <!-- Logout Button (No Login button needed)             @click="onLogoutClick"-->
          <button

            class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center space-x-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      <!-- Main Body Content Slot -->
      <main class="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, h } from 'vue';
import { useRouter } from 'vue-router';
// import { useAuthStore } from '@/composables/auth';

const router = useRouter();
// const authStore = useAuthStore();

const isCollapsed = ref(false);
const isMobileOpen = ref(false);

// const checkAuthentication = () => {
//   const token = localStorage.getItem('accessToken');
//   if (!authStore.isAuthenticated && !token) {
//     router.push('/');
//   }
// };

// Check authentication on component mount and route guard watch
onMounted(() => {
//   checkAuthentication();
  handleResize();
  window.addEventListener('resize', handleResize);
});

// watch(
//   () => authStore.isAuthenticated,
//   (isAuth) => {
//     if (!isAuth) {
//       router.push('/');
//     }
//   }
// );

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const handleNavClick = () => {
  if (window.innerWidth < 1024) {
    isMobileOpen.value = false;
  }
};

const handleResize = () => {
  if (window.innerWidth < 1024) {
    isCollapsed.value = false; 
    isMobileOpen.value = false;
  }
};

const onInstallClick = () => {
  console.log('Open app installation dialog');
};

// const onLogoutClick = () => {
//   if (authStore.logout) {
//     authStore.logout();
//   }
//   localStorage.removeItem('accessToken');
//   router.push('/');
// };

// SVG Icon Render Functions


const ClassesIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
]);

const ExamsIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
]);

const QuestionBankIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 20h8M8 4h8m-4 0v16m-4-8h8' })
]);

const TemplatesIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' })
]);

const AccountIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
]);

// Navigation items including Account Management
const navItems = [
  { name: 'TeacherClasses', label: 'Lớp học', icon: ClassesIcon },
  { name: 'TeacherExams', label: 'Kỳ thi', icon: ExamsIcon },
  { name: 'TeacherQuestionBank', label: 'Ngân hàng câu hỏi', icon: QuestionBankIcon },
  { name: 'TeacherTemplates', label: 'Mẫu phiếu OMR', icon: TemplatesIcon },
  { name: 'TeacherAccount', label: 'Tài khoản', icon: AccountIcon },
];
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>