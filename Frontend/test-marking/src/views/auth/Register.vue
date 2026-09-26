<template>
  <div class="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 py-8">
    <!-- Main Card Container -->
    <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      


      <!-- Form Body -->
      <div class="p-8">
        <div class="mb-6">
          <h3 class="text-xl font-bold text-slate-800">Tạo tài khoản mới</h3>
          <p class="text-xs text-slate-500 mt-0.5">Đăng ký để quản lý lớp học và chấm thi tự động</p>
        </div>

        <!-- Alert Error Box -->
        <div v-if="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center">
          <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <!-- Full Name Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Họ và tên
            </label>
            <input
              v-model="fullName"
              type="text"
              required
              placeholder="Nguyễn Văn A"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
          </div>

          <!-- Email Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email trường / Công tác
            </label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="teacher@hust.edu.vn"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
          </div>

          <!-- Password & Confirm Password Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <input
                v-model="password"
                type="password"
                required
                placeholder="Tối thiểu 6 ký tự"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Xác nhận mật khẩu
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                required
                placeholder="Nhập lại mật khẩu"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <!-- Account Role Option -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Loại tài khoản
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label 
                :class="[
                  'flex items-center justify-center p-2.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all',
                  role === 'TEACHER' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                ]"
              >
                <input type="radio" v-model="role" value="TEACHER" class="sr-only" />
                Giảng viên / Giáo viên
              </label>
              <label 
                :class="[
                  'flex items-center justify-center p-2.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all',
                  role === 'STUDENT' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                ]"
              >
                <input type="radio" v-model="role" value="STUDENT" class="sr-only" />
                Sinh viên / Học sinh
              </label>
            </div>
          </div>

          <!-- Terms Agreement -->
          <div class="flex items-start">
            <input
              id="terms"
              v-model="agreeTerms"
              type="checkbox"
              required
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer mt-0.5"
            />
            <label for="terms" class="ml-2 text-xs text-slate-600">
              Tôi đồng ý với <a href="#" class="text-blue-600 hover:underline">Điều khoản dịch vụ</a> và <a href="#" class="text-blue-600 hover:underline">Chính sách bảo mật</a>.
            </label>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
          >
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký' }}</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="mt-6 border-t border-slate-100 pt-4 text-center">
          <p class="text-xs text-slate-500">
            Đã có tài khoản?
            <router-link :to="{ name: 'Login' }" class="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Đăng nhập ngay
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const fullName = ref<string>('')
const email = ref<string>('')
const password = ref<string>('')
const confirmPassword = ref<string>('')
const role = ref<'TEACHER' | 'STUDENT'>('TEACHER')
const agreeTerms = ref<boolean>(false)

const isLoading = ref<boolean>(false)
const errorMessage = ref<string>('')

const handleRegister = async (): Promise<void> => {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Mật khẩu xác nhận không trùng khớp.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // Simulated register API call
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Redirect to Login page after successful registration
    router.push({ name: 'Login' })
  } catch (err: unknown) {
    errorMessage.value = 'Đăng ký thất bại. Email có thể đã được sử dụng.'
  } finally {
    isLoading.value = false
  }
}
</script>