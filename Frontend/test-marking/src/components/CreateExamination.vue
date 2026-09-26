<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        <!-- Modal Header & Stepper Navigation -->
        <div class="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Tạo kỳ thi mới</h2>
            <p class="text-xs text-slate-400">Bước {{ currentStep }} / 4: {{ stepTitles[currentStep - 1] }}</p>
          </div>

          <!-- Step Indicators -->
          <div class="hidden sm:flex items-center space-x-2">
            <div
              v-for="step in 4"
              :key="step"
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                currentStep === step
                  ? 'bg-blue-600 text-white shadow-md'
                  : currentStep > step
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              ]"
            >
              <svg v-if="currentStep > step" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else>{{ step }}</span>
            </div>
          </div>

          <button @click="closeModal" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Error Overlay -->
        <div v-if="errorMessage" class="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2">
          <svg class="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Modal Body Content -->
        <div class="p-6 overflow-y-auto flex-1">

          <!-- PHASE 1: General Examination Information -->
          <div v-if="currentStep === 1" class="space-y-4">
            <!-- Exam Name -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Tên kỳ thi <span class="text-red-500">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ví dụ: Thi Giữa Kỳ Triết học Mác - Lênin 2026..."
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Subject -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Môn học <span class="text-red-500">*</span></label>
                <input
                  v-model="form.subject"
                  type="text"
                  placeholder="Nhập tên môn học..."
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <!-- Participated Class (Dropdown placeholder) -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Lớp học tham gia <span class="text-red-500">*</span></label>
                <select
                  v-model="form.classId"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                >
                  <option value="" disabled>-- Chọn lớp học --</option>
                  <option v-for="c in classOptions" :key="c.id" :value="c.id">{{ c.name }} ({{ c.code }})</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Grade Scale -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Thang điểm</label>
                <select
                  v-model.number="form.gradeScale"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                >
                  <option :value="10">Thang điểm 10</option>
                  <option :value="100">Thang điểm 100</option>
                </select>
              </div>

              <!-- Exam Type (Offline marking / Online submission) -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Hình thức tổ chức</label>
                <select
                  v-model="form.examType"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                >
                  <option value="OFFLINE_GRADING">Chấm bài Offline (Giảng viên quét phiếu)</option>
                  <option value="ONLINE_SUBMISSION">Nộp bài Online (Hệ thống tự động chấm)</option>
                </select>
              </div>
            </div>

            <!-- Start Date Time & End Date Time -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Thời gian bắt đầu <span class="text-red-500">*</span></label>
                <input
                  v-model="form.startTime"
                  type="datetime-local"
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Thời gian kết thúc <span class="text-red-500">*</span></label>
                <input
                  v-model="form.endTime"
                  type="datetime-local"
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          <!-- PHASE 2: Choose Answer Sheet Template -->
          <div v-if="currentStep === 2" class="space-y-6">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Chọn mẫu phiếu trả lời</label>
            
            <!-- System Templates -->
            <div class="space-y-2">
              <h3 class="text-xs font-semibold text-slate-500 uppercase">Mẫu mặc định hệ thống</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  v-for="tpl in systemTemplates"
                  :key="tpl.id"
                  @click="form.templateId = tpl.id"
                  :class="[
                    'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2',
                    form.templateId === tpl.id
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-slate-800">{{ tpl.name }}</span>
                    <input type="radio" :checked="form.templateId === tpl.id" class="text-blue-600" />
                  </div>
                  <p class="text-xs text-slate-500">{{ tpl.description }}</p>
                </div>
              </div>
            </div>

            <!-- User Created Templates -->
            <div class="space-y-2 border-t border-slate-100 pt-4">
              <h3 class="text-xs font-semibold text-slate-500 uppercase">Mẫu do bạn đã tạo</h3>
              <div v-if="userTemplates.length > 0" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  v-for="tpl in userTemplates"
                  :key="tpl.id"
                  @click="form.templateId = tpl.id"
                  :class="[
                    'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2',
                    form.templateId === tpl.id
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-slate-800">{{ tpl.name }}</span>
                    <input type="radio" :checked="form.templateId === tpl.id" class="text-blue-600" />
                  </div>
                  <p class="text-xs text-slate-500">{{ tpl.questionsCount }} câu • {{ tpl.infoBoxes }} khung thông tin phụ</p>
                </div>
              </div>
              <p v-else class="text-xs text-slate-400 italic">Chưa có mẫu phiếu tùy chỉnh nào.</p>
            </div>
          </div>

          <!-- PHASE 3: Choose Question Bank & Auto Generation Rules -->
          <div v-if="currentStep === 3" class="space-y-5">
            <!-- Question Bank Select -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Ngân hàng câu hỏi <span class="text-red-500">*</span></label>
              <select
                v-model="form.bankId"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              >
                <option value="" disabled>-- Chọn ngân hàng câu hỏi --</option>
                <option v-for="b in questionBanks" :key="b.id" :value="b.id">
                  {{ b.title }} (Tổng: {{ b.totalQuestions }} câu)
                </option>
              </select>
            </div>

            <!-- Number of Exam Codes -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Số lượng mã đề</label>
              <input
                    v-model.number="form.codeCount"
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Nhập số lượng mã đề (Ví dụ: 4)..."
                    class="w-full sm:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
            </div>

            <!-- Difficulty Breakdown -->
            <div class="border-t border-slate-100 pt-4 space-y-3">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Cấu trúc số lượng câu hỏi theo độ khó</label>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Easy -->
                <div class="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <span class="text-xs font-bold text-emerald-700 uppercase">Câu Dễ</span>
                  <input
                    v-model.number="form.easyCount"
                    type="number"
                    min="0"
                    class="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <!-- Medium -->
                <div class="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                  <span class="text-xs font-bold text-amber-700 uppercase">Câu Trung Bình</span>
                  <input
                    v-model.number="form.mediumCount"
                    type="number"
                    min="0"
                    class="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <!-- Hard -->
                <div class="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                  <span class="text-xs font-bold text-red-700 uppercase">Câu Khó</span>
                  <input
                    v-model.number="form.hardCount"
                    type="number"
                    min="0"
                    class="w-full px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div class="text-right text-xs text-slate-500 pt-1">
                Tổng số câu mỗi đề: <strong class="text-blue-600 text-sm">{{ totalSelectedQuestions }}</strong> câu
              </div>
            </div>
          </div>

          <!-- PHASE 4: Preview Generated Exam Codes & Questions -->
          <div v-if="currentStep === 4" class="space-y-5">
            
            <!-- Code Tab Selectors -->
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div class="flex items-center space-x-2 overflow-x-auto">
                <button
                  v-for="(codeData, code) in generatedCodes"
                  :key="code"
                  @click="activeCodeTab = code"
                  :class="[
                    'px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all',
                    activeCodeTab === code
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  ]"
                >
                  Mã đề {{ code }}
                </button>
              </div>

              <!-- Regenerate button for current active code -->
              <button
                @click="regenerateCode(activeCodeTab)"
                class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200 transition flex items-center space-x-1 shrink-0"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Tạo lại mã {{ activeCodeTab }}</span>
              </button>
            </div>

            <!-- Preview Table of Questions -->
            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[360px] overflow-y-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase sticky top-0">
                  <tr>
                    <th class="p-3 w-12 text-center">STT</th>
                    <th class="p-3">Nội dung câu hỏi & Các đáp án</th>
                    <th class="p-3 w-28 text-center">Độ khó</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="(q, idx) in generatedCodes[activeCodeTab]"
                    :key="q.id"
                    class="hover:bg-slate-50 transition"
                  >
                    <!-- STT -->
                    <td class="p-3 text-center font-bold text-slate-500">{{ idx + 1 }}</td>

                    <!-- Question & Answer Details -->
                    <td class="p-3 space-y-1.5">
                    <!-- Render LaTeX cho nội dung câu hỏi -->
                    <p class="font-bold text-slate-800 text-xs" v-html="renderLatexText(q.content)"></p>
                    
                    <!-- Options -->
                    <div class="grid grid-cols-2 gap-1.5 pt-1">
                        <div
                        v-for="(opt, oIdx) in q.options"
                        :key="oIdx"
                        :class="[
                            'p-1.5 rounded-lg border text-[11px] flex items-center space-x-1.5',
                            opt.isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        ]"
                        >
                        <span class="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {{ ['A', 'B', 'C', 'D'][Number(oIdx)] }}
                        </span>

                        <!-- Render LaTeX cho từng lựa chọn đáp án (dùng v-html thay cho v-text/mustache) -->
                        <span v-html="renderLatexText(opt.text)"></span>
                        </div>
                    </div>
                    </td>

                    <!-- Difficulty -->
                    <td class="p-3 text-center">
                      <span
                        :class="[
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border',
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : q.difficulty === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        ]"
                      >
                        {{ q.difficulty }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

        <!-- Modal Footer Actions -->
        <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            v-if="currentStep > 1"
            type="button"
            @click="currentStep--"
            class="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Quay lại
          </button>
          <div v-else></div>

          <div class="flex items-center space-x-2">
            <button
              v-if="currentStep < 4"
              type="button"
              @click="nextStep"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              Tiếp theo
            </button>

            <!-- Final Phase Actions -->
            <template v-else>
              <button
                type="button"
                @click="exportAllTests"
                class="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition flex items-center space-x-1"
              >
                <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Xuất tất cả đề</span>
              </button>

              <button
                type="button"
                @click="saveExamination"
                class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                Lưu kỳ thi
              </button>
            </template>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: any): void
}>()

const currentStep = ref(1)
const errorMessage = ref('')
const activeCodeTab = ref('001')

const stepTitles = [
  'Thông tin chung',
  'Chọn mẫu phiếu',
  'Cấu hình mã đề & Ngân hàng',
  'Xem trước & Hoàn tất'
]

// Mock Dropdown Options
const classOptions = [
  { id: 'c1', name: 'Hệ Nhúng 2026', code: 'IT4409' },
  { id: 'c2', name: 'Triết học Mác-Lênin', code: 'IT4210E' },
  { id: 'c3', name: 'Thị giác máy tính', code: 'IT4800' }
]

const systemTemplates = [
  { id: 'tpl_20', name: 'Mẫu 20 câu', description: 'Phiếu tiêu chuẩn 20 đáp án trắc nghiệm' },
  { id: 'tpl_50', name: 'Mẫu 50 câu', description: 'Phiếu tiêu chuẩn 50 đáp án trắc nghiệm' },
  { id: 'tpl_100', name: 'Mẫu 100 câu', description: 'Phiếu tiêu chuẩn 100 đáp án trắc nghiệm' }
]

const userTemplates = [
  { id: 'tpl_u1', name: 'Phiếu giữa kỳ IT4409', questionsCount: 40, infoBoxes: 2 }
]

const questionBanks = [
  { id: 'b1', title: 'Ngân hàng Triết học Mác - Lênin 2026', totalQuestions: 150 },
  { id: 'b2', title: 'Ngân hàng Hệ Nhúng STM32', totalQuestions: 80 }
]

// Form State
const form = ref({
  name: '',
  subject: '',
  classId: '',
  gradeScale: 10,
  examType: 'OFFLINE_GRADING',
  startTime: '',
  endTime: '',
  templateId: 'tpl_50',
  bankId: '',
  codeCount: 4,
  easyCount: 10,
  mediumCount: 15,
  hardCount: 5
})

const generatedCodes = ref<Record<string, any[]>>({})

const totalSelectedQuestions = computed(() => {
  return (form.value.easyCount || 0) + (form.value.mediumCount || 0) + (form.value.hardCount || 0)
})

const nextStep = () => {
  errorMessage.value = ''

  if (currentStep.value === 1) {
    if (!form.value.name.trim() || !form.value.subject.trim() || !form.value.classId) {
      errorMessage.value = 'Vui lòng điền đầy đủ các thông tin bắt buộc (*).'
      return
    }
    if (!form.value.startTime || !form.value.endTime) {
      errorMessage.value = 'Vui lòng chọn thời gian bắt đầu và kết thúc.'
      return
    }
  }

  if (currentStep.value === 3) {
    if (!form.value.bankId) {
      errorMessage.value = 'Vui lòng chọn ngân hàng câu hỏi.'
      return
    }
    if (totalSelectedQuestions.value <= 0) {
      errorMessage.value = 'Tổng số lượng câu hỏi phải lớn hơn 0.'
      return
    }
    generateMockExams()
  }

  currentStep.value++
}

// Auto-generate exam codes
const generateMockExams = () => {
  const codes: Record<string, any[]> = {}
  const count = form.value.codeCount

  for (let i = 1; i <= count; i++) {
    const codeStr = String(i).padStart(3, '0')
    codes[codeStr] = createRandomQuestionsForCode()
  }

  generatedCodes.value = codes
  activeCodeTab.value = '001'
}

const createRandomQuestionsForCode = () => {
  const list = []
  const total = totalSelectedQuestions.value

  for (let i = 1; i <= total; i++) {
    list.push({
      id: Math.random(),
      content: `Câu hỏi mẫu số ${i}: Cho hàm số $f(x) = x^2 - 4x + 3$. Khẳng định nào đúng?`,
      options: [
        { text: 'Đáp án A (Đúng)', isCorrect: i % 4 === 1 },
        { text: 'Đáp án B', isCorrect: i % 4 === 2 },
        { text: 'Đáp án C', isCorrect: i % 4 === 3 },
        { text: 'Đáp án D', isCorrect: i % 4 === 0 }
      ],
      difficulty: i <= form.value.easyCount ? 'EASY' : i <= form.value.easyCount + form.value.mediumCount ? 'MEDIUM' : 'HARD'
    })
  }

  return list
}

const regenerateCode = (code: string) => {
  generatedCodes.value[code] = createRandomQuestionsForCode()
}

const saveExamination = () => {
  const payload = {
    ...form.value,
    generatedCodes: generatedCodes.value
  }
  console.log('Saving Examination:', payload)
  emit('save', payload)
  closeModal()
}

const exportAllTests = () => {
  alert(`Bắt đầu xuất tất cả ${form.value.codeCount} mã đề thi (.PDF)...`)
}

const closeModal = () => {
  currentStep.value = 1
  errorMessage.value = ''
  emit('close')
}

const renderLatexText = (text: string) => {
  if (!text) return ''
  try {
    return text.replace(/\$(.*?)\$/g, (_, equation) => {
      return katex.renderToString(equation, { throwOnError: false })
    })
  } catch {
    return text
  }
}
</script>