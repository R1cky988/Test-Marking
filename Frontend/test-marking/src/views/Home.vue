<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
    
    <section class="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white py-20 px-6 text-center relative overflow-hidden">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/20 blur-[120px] pointer-events-none rounded-full"></div>

      <div class="max-w-4xl mx-auto relative z-10">
        
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Chấm thi Trắc nghiệm Tự động & Chính xác với <span class="text-blue-500">TestMarking</span>
        </h1>

        <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Nền tảng hỗ trợ Giảng viên tạo đề, quản lý câu hỏi và chấm bài thi trắc nghiệm OMR thông qua ứng dụng quét camera Android hoặc hệ thống Offline.
        </p>

        <!-- CTA Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <RouterLink
            :to="{ name: 'Login' }"
            class="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center"
          >
            <span>Bắt đầu ngay</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </RouterLink>

          <button
            @click="handleDownloadApp"
            class="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl transition-all flex items-center justify-center"
          >
            <svg class="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Tải App Chấm Phiếu
          </button>
        </div>
      </div>
    </section>

    <!-- Key Features Section -->
    <section class="py-16 px-6 max-w-6xl mx-auto w-full">
      <div class="text-center mb-12">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Tính năng nổi bật</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Feature 1 -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h0.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-2">Quét phiếu Android OpenCV</h3>
          <p class="text-sm text-slate-500 leading-relaxed">
            Nhận diện khung phiếu tự động qua mã ArUco marker thời gian thực, căn chỉnh góc nghiêng và xử lý ảnh OMR chính xác cao.
          </p>
        </div>

        <!-- Feature 2 -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-2">Quy trình Chấm 2 Chế độ</h3>
          <p class="text-sm text-slate-500 leading-relaxed">
            Hỗ trợ cả chế độ Sinh viên tự tải bài làm lên ứng dụng hoặc Giảng viên quét hàng loạt bài thi Offline trực tiếp.
          </p>
        </div>

        <!-- Feature 3 -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-2">Quản lý Ngân hàng & Báo cáo</h3>
          <p class="text-sm text-slate-500 leading-relaxed">
            Quản lý câu hỏi theo chủ đề/thẻ (tags), tự động xáo trộn mã đề thi và xuất bảng điểm danh sách bài thi ra Excel.
          </p>
        </div>
      </div>
    </section>

    <!-- App Mobile Download Banner Section -->
    <section class="bg-slate-900 text-white py-12 px-6 border-t border-slate-800">
      <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-800/80 p-8 rounded-2xl border border-slate-700/60 shadow-xl">
        <div class="space-y-2 text-center md:text-left">
          <h3 class="text-xl font-bold text-white">Tải ứng dụng chấm thi Android</h3>
          <p class="text-xs sm:text-sm text-slate-400">
            Cài đặt file APK trực tiếp trên điện thoại để quét camera ArUco thời gian thực và chấm bài Offline không cần Internet.
          </p>
        </div>

        <button
          @click="handleDownloadApp"
          class="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Tải xuống Android APK</span>
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="mt-auto bg-slate-950 text-slate-400 py-8 px-6 border-t border-slate-900 text-xs">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© 2026 TestMarking OMR Platform. All rights reserved.</span>

        <!-- Links & Download CTA -->
        <div class="flex items-center space-x-4 sm:space-x-6">
          <RouterLink :to="{ name: 'Login' }" class="hover:text-white transition-colors">Đăng nhập</RouterLink>
          <RouterLink :to="{ name: 'Register' }" class="hover:text-white transition-colors">Đăng ký</RouterLink>
          
          <button
            @click="handleDownloadApp"
            class="bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-all font-medium flex items-center space-x-1.5"
          >
            <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Tải ứng dụng</span>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

const handleDownloadApp = () => {
  window.open('https://github.com/R1cky988/DATN')
}
</script>