<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
          
          <!-- Modal Header / Title & Close Button -->
          <div class="w-full flex items-center justify-between text-white mb-3 px-1">
            <span class="text-xs sm:text-sm font-semibold tracking-wide text-slate-200">
              {{ title || 'Xem trước mẫu phiếu OMR' }}
            </span>

            <button
              @click="closeModal"
              class="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center space-x-1"
            >
              <span class="text-xs font-semibold">Đóng</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Full-Size Image Container -->
          <div class="bg-white p-2 sm:p-3 rounded-2xl shadow-2xl border border-slate-700 max-h-[82vh] overflow-hidden flex items-center justify-center">
            <img
              :src="imageSrc"
              :alt="title || 'Mẫu phiếu OMR'"
              class="max-w-full max-h-[78vh] object-contain rounded-xl"
            />
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean
  imageSrc: string
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

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