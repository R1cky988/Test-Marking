<template>
  <div class="max-w-4xl mx-auto space-y-6">

    <!-- Page Title -->
    <div>
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Thông tin tài khoản</h1>
      <p class="text-xs text-slate-500 mt-1">Quản lý thông tin cá nhân, bảo mật và ứng dụng di động</p>
    </div>

    <!-- Global Alert Message -->
    <div
      v-if="statusMessage.text"
      :class="[
        'p-4 rounded-xl text-xs flex items-center justify-between border transition-all',
        statusMessage.type === 'error'
          ? 'bg-red-50 border-red-200 text-red-600'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      ]"
    >
      <div class="flex items-center space-x-2">
        <svg
          v-if="statusMessage.type === 'error'"
          class="w-5 h-5 shrink-0 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg
          v-else
          class="w-5 h-5 shrink-0 text-emerald-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="font-medium">{{ statusMessage.text }}</span>
      </div>
      <button @click="statusMessage.text = ''" class="text-slate-400 hover:text-slate-600">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- SECTION 1: Account Information -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div class="border-b border-slate-100 pb-4">
        <h2 class="text-base font-bold text-slate-800">Thông tin cá nhân</h2>
        <p class="text-xs text-slate-400">Chi tiết thông tin đăng ký hệ thống</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Full Name -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Họ và tên</label>
          <div class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium">
            {{ userProfile.fullName }}
          </div>
        </div>

        <!-- Current Email Address -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Địa chỉ Email hiện tại</label>
          <div class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium">
            {{ userProfile.email }}
          </div>
        </div>

        <!-- Role Badge -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Vai trò hệ thống</label>
          <div class="flex items-center pt-1">
            <span
              :class="[
                'px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider',
                userProfile.role === 'TEACHER'
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              ]"
            >
              {{ userProfile.role === 'TEACHER' ? 'Giảng viên' : 'Sinh viên' }}
            </span>
          </div>
        </div>

        <!-- Created Date -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Ngày tham gia</label>
          <div class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium">
            {{ formatDate(userProfile.createdAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Change Email -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div class="border-b border-slate-100 pb-4">
        <h2 class="text-base font-bold text-slate-800">Cập nhật Email</h2>
        <p class="text-xs text-slate-400">Thay đổi địa chỉ email liên kết với tài khoản của bạn</p>
      </div>

      <form @submit.prevent="handleChangeEmail" class="space-y-4 max-w-md">
        <!-- New Email Input -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Địa chỉ Email mới <span class="text-red-500">*</span>
          </label>
          <input
            v-model="emailForm.newEmail"
            type="email"
            placeholder="Nhập email mới của bạn..."
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <!-- Password Confirmation -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Xác nhận mật khẩu <span class="text-red-500">*</span>
          </label>
          <input
            v-model="emailForm.password"
            type="password"
            placeholder="Nhập mật khẩu hiện tại để xác thực..."
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <!-- Submit Email Button -->
        <div class="pt-1">
          <button
            type="submit"
            :disabled="isEmailLoading"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-2"
          >
            <svg v-if="isEmailLoading" class="w-4 h-4 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isEmailLoading ? 'Đang cập nhật...' : 'Cập nhật Email' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- SECTION 3: Change Password -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div class="border-b border-slate-100 pb-4">
        <h2 class="text-base font-bold text-slate-800">Đổi mật khẩu</h2>
        <p class="text-xs text-slate-400">Cập nhật mật khẩu để tăng cường bảo mật cho tài khoản</p>
      </div>

      <form @submit.prevent="handleChangePassword" class="space-y-4 max-w-md">
        <!-- Current Password -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Mật khẩu hiện tại <span class="text-red-500">*</span>
          </label>
          <input
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="Nhập mật khẩu hiện tại..."
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <!-- New Password -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Mật khẩu mới <span class="text-red-500">*</span>
          </label>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <!-- Repeat New Password -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Xác nhận mật khẩu mới <span class="text-red-500">*</span>
          </label>
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="Nhập lại mật khẩu mới..."
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <!-- Submit Password Button -->
        <div class="pt-1">
          <button
            type="submit"
            :disabled="isPasswordLoading"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-2"
          >
            <svg v-if="isPasswordLoading" class="w-4 h-4 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isPasswordLoading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- SECTION 4: Mobile App Installation -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div class="border-b border-slate-100 pb-4">
        <h2 class="text-base font-bold text-slate-800">Ứng dụng di động</h2>
        <p class="text-xs text-slate-400">Tải ứng dụng hỗ trợ chấm thi tự động trên Android</p>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-between gap-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
        <div class="flex items-start space-x-4">
          <!-- Smartphone Icon Badge -->
          <div class="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md overflow-hidden">
            <img src="/icon.png" alt="App Icon" class="w-full h-full object-cover">
        </div>

          <div class="space-y-1">
            <h3 class="text-sm font-bold text-slate-800">Test Marking Mobile (Android)</h3>
            <p class="text-xs text-slate-500 leading-relaxed max-w-lg">
              Sử dụng camera điện thoại để quét và chấm bài thi trắc nghiệm bằng công nghệ OpenCV một cách tự động và nhanh chóng.
            </p>
            <div class="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
              <span>Phiên bản: <b>v1.2.0</b></span>

            </div>
          </div>
        </div>

        <!-- APK Download Button -->
        <a
          :href="appDownloadUrl"
          download
          class="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center justify-center space-x-2 shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Tải file APK (.apk)</span>
        </a>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Role = 'TEACHER' | 'STUDENT'

interface UserProfile {
  fullName: string
  email: string
  role: Role
  createdAt: string
}

// User Profile State
const userProfile = ref<UserProfile>({
  fullName: 'Nguyễn Văn A',
  email: 'nguyenvana@hust.edu.vn',
  role: 'TEACHER',
  createdAt: '2026-01-15T08:30:00Z'
})

// Change Email Form State
const emailForm = ref({
  newEmail: '',
  password: ''
})

// Change Password Form State
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const isEmailLoading = ref<boolean>(false)
const isPasswordLoading = ref<boolean>(false)
const statusMessage = ref<{ text: string; type: 'success' | 'error' }>({ text: '', type: 'success' })

const appDownloadUrl = ref('/downloads/test-marking-v1.2.0.apk')

// Email Update Validation & Action
const handleChangeEmail = async () => {
  statusMessage.value = { text: '', type: 'error' }

  if (!emailForm.value.newEmail.trim()) {
    statusMessage.value = { text: 'Vui lòng nhập địa chỉ email mới.', type: 'error' }
    return
  }

  if (!emailForm.value.password) {
    statusMessage.value = { text: 'Vui lòng nhập mật khẩu hiện tại để xác nhận.', type: 'error' }
    return
  }

  isEmailLoading.value = true

  try {
    console.log('Submitting email update:', emailForm.value)
    await new Promise(resolve => setTimeout(resolve, 800))

    userProfile.value.email = emailForm.value.newEmail.trim()
    emailForm.value = { newEmail: '', password: '' }

    statusMessage.value = {
      text: 'Cập nhật địa chỉ email thành công!',
      type: 'success'
    }
  } catch (err) {
    statusMessage.value = {
      text: 'Không thể cập nhật email. Vui lòng kiểm tra lại mật khẩu.',
      type: 'error'
    }
  } finally {
    isEmailLoading.value = false
  }
}

// Password Update Validation & Action
const handleChangePassword = async () => {
  statusMessage.value = { text: '', type: 'error' }

  if (!passwordForm.value.currentPassword) {
    statusMessage.value = { text: 'Vui lòng nhập mật khẩu hiện tại.', type: 'error' }
    return
  }

  if (!passwordForm.value.newPassword) {
    statusMessage.value = { text: 'Vui lòng nhập mật khẩu mới.', type: 'error' }
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    statusMessage.value = { text: 'Mật khẩu mới phải có ít nhất 6 ký tự.', type: 'error' }
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    statusMessage.value = { text: 'Mật khẩu xác nhận không khớp với mật khẩu mới.', type: 'error' }
    return
  }

  isPasswordLoading.value = true

  try {
    console.log('Submitting password update:', passwordForm.value)
    await new Promise(resolve => setTimeout(resolve, 800))

    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }

    statusMessage.value = {
      text: 'Đổi mật khẩu thành công!',
      type: 'success'
    }
  } catch (err) {
    statusMessage.value = {
      text: 'Đã xảy ra lỗi khi đổi mật khẩu. Vui lòng thử lại.',
      type: 'error'
    }
  } finally {
    isPasswordLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>