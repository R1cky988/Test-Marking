<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm outline-none"
    >
      <!-- Modal Container -->
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
  <div>
    <h2 class="text-base font-bold text-slate-800">Chia sẻ Ngân Hàng Câu Hỏi</h2>
    <p class="text-xs text-slate-400 line-clamp-1">{{ bank?.title }}</p>
  </div>
  <button
    @click="closeModal"
    class="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition cursor-pointer"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          
          <!-- Section 1: Visibility Status Toggle (Public / Private) -->
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Trạng thái chia sẻ</h4>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ isPublic ? 'Mọi người có liên kết đều có thể xem' : 'Chỉ những người được chỉ định mới có thể truy cập' }}
              </p>
            </div>

            <button
              type="button"
              @click="toggleVisibility"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 shrink-0 cursor-pointer',
                isPublic
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
              ]"
            >
              <span class="w-2 h-2 rounded-full" :class="isPublic ? 'bg-emerald-500' : 'bg-slate-500'"></span>
              <span>{{ isPublic ? 'Công Khai' : 'Riêng Tư' }}</span>
            </button>
          </div>

          <!-- Section 2: Invite by Email -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Mời đồng nghiệp qua Email
            </label>
            <div class="flex items-center space-x-2">
              <input
                v-model="inviteEmail"
                type="email"
                placeholder="nhap.email@truong.edu.vn"
                class="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <button
                @click="sendInvite"
                :disabled="!inviteEmail.trim() || isSending"
                class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-xl transition shadow-sm shrink-0 flex items-center space-x-1 cursor-pointer"
              >
                <span>{{ isSending ? 'Đang gửi...' : 'Gửi lời mời' }}</span>
              </button>
            </div>
            <p v-if="inviteSuccess" class="text-[11px] text-emerald-600 font-medium">
              ✓ Đã gửi lời mời chia sẻ tới {{ invitedEmailSubmitted }}
            </p>
          </div>

          <!-- Section 3: Shareable Direct Link -->
          <div class="space-y-2 border-t border-slate-100 pt-4">
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Đường dẫn truy cập trực tiếp
            </label>
            <div class="flex items-center space-x-2">
              <input
                type="text"
                readonly
                :value="shareUrl"
                class="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono select-all focus:outline-none"
              />
              <button
                @click="copyLink"
                class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl transition flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{{ isCopied ? 'Đã sao chép!' : 'Sao chép' }}</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Modal Footer Actions -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            @click="navigateToBankPage"
            class="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Đi tới trang ngân hàng câu hỏi</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Hoàn tất
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { QuestionBankItem } from './QuestionBankCard.vue'

const props = defineProps<{
  isOpen: boolean
  bank: QuestionBankItem | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update-status', payload: { id: string | number; isPublic: boolean }): void
}>()

const router = useRouter()

const inviteEmail = ref('')
const isSending = ref(false)
const inviteSuccess = ref(false)
const invitedEmailSubmitted = ref('')

const isCopied = ref(false)
const isPublic = ref(false)

// Watch bank prop changes to initialize state
watch(
  () => props.bank,
  (newBank) => {
    if (newBank) {
      isPublic.value = newBank.isPublic
      inviteEmail.value = ''
      inviteSuccess.value = false
      isCopied.value = false
    }
  },
  { immediate: true }
)

// Computed shareable link based on current domain and bank ID
const shareUrl = computed(() => {
  if (!props.bank) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://testmarking.edu.vn'
  return `${origin}/teacher/question-bank/${props.bank.id}`
})

const toggleVisibility = () => {
  isPublic.value = !isPublic.value
  if (props.bank) {
    emit('update-status', { id: props.bank.id, isPublic: isPublic.value })
  }
}

const sendInvite = async () => {
  if (!inviteEmail.value.trim()) return

  isSending.value = true
  inviteSuccess.value = false

  try {
    // Simulated API call to send invite
    await new Promise((resolve) => setTimeout(resolve, 600))
    invitedEmailSubmitted.value = inviteEmail.value
    inviteSuccess.value = true
    inviteEmail.value = ''
  } finally {
    isSending.value = false
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text', err)
  }
}

const navigateToBankPage = () => {
  closeModal()
  if (props.bank) {
    router.push({
      name: 'TeacherQuestionBankDetail',
      params: { uuid: String(props.bank.id) }
    })
  }
}

const closeModal = () => {
  emit('close')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>