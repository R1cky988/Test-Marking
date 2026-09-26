<template>
  <div class="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
    <!-- Main Card Container -->
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
      
      <!-- Minimal Form Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-800">Đăng nhập</h2>
        <p class="text-xs text-slate-500 mt-1">Hệ thống chấm thi TestMarking</p>
      </div>

      <!-- Alert Error Box -->
      <div v-if="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center">
        <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Email / Username Input -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email / Tên đăng nhập
          </label>
          <input
            v-model="email"
            type="text"
            required
            placeholder="teacher@testmarking.edu.vn"
            class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>

        <!-- Password Input -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Mật khẩu
            </label>
            <a href="#" class="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
              Quên mật khẩu?
            </a>
          </div>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="••••••••"
              class="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="!showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path v-if="!showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.02 10.02 0 013.122-.463c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center mt-2"
        >
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isLoading ? 'Đang xử lý...' : 'Đăng nhập' }}</span>
        </button>
      </form>

      <!-- Footer Link -->
      <div class="mt-6 border-t border-slate-100 pt-4 text-center">
        <p class="text-xs text-slate-500">
          Chưa có tài khoản?
          <router-link :to="{ name: 'Register' }" class="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Đăng ký ngay
          </router-link>
        </p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref<string>('')
const password = ref<string>('')
const showPassword = ref<boolean>(false)

const isLoading = ref<boolean>(false)
const errorMessage = ref<string>('')

const handleLogin = async (): Promise<void> => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    await new Promise((resolve) => setTimeout(resolve, 800))

    localStorage.setItem('accessToken', 'mock-jwt-token')
    router.push({ name: 'TeacherAccount' })
  } catch (err: unknown) {
    errorMessage.value = 'Tên đăng nhập hoặc mật khẩu không chính xác.'
  } finally {
    isLoading.value = false
  }
}
</script>