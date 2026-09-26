<template>
    <div class="max-w-5xl mx-auto space-y-6">

        <!-- Header Section -->
        <div class="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
                <button @click="goBack"
                    class="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-1">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Quay lại ngân hàng câu hỏi</span>
                </button>
                <h1 class="text-2xl font-bold text-slate-800 tracking-tight">
                    {{ isEditMode ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi mới' }}
                </h1>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-3">
                <button type="button" @click="goBack"
                    class="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition">
                    Hủy bỏ
                </button>
                <button type="button" @click="handleSubmit" :disabled="isLoading"
                    class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{{ isEditMode ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi' }}</span>
                </button>
            </div>
        </div>

        <!-- Error Alert Overlay -->
        <div v-if="errorMessage"
            class="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2">
            <svg class="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ errorMessage }}</span>
        </div>

        <!-- Main Question Form Card -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

            <!-- 1. Question Content Field with TinyMCE & KaTeX Preview -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Nội dung câu hỏi <span class="text-red-500">*</span>
                </label>

                <!-- TinyMCE Editor -->
                <Editor v-model="form.content" api-key="colkiyzhyaz80bnwgu7mr61wi1fkozjiz2y2gzhv3qgv9q73"
                    :init="tinyMceConfig" />

                <!-- Real-time KaTeX LaTeX Live Preview Panel -->
                <div class="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                    <span class="font-bold block text-slate-500 mb-1">Xem trước LaTeX (KaTeX Live):</span>
                    <div v-html="renderedLatex" class="min-h-[24px]"></div>
                </div>
            </div>

            <!-- 2. Option Count Selector (Up to 5) -->
            <div class="space-y-2">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Số lượng lựa chọn (Tối đa 5)
                </label>
                <div class="flex items-center space-x-2">
                    <button v-for="count in [2, 3, 4, 5]" :key="count" type="button" @click="setOptionCount(count)"
                        :class="[
                            'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                            optionCount === count
                                ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        ]">
                        {{ count }} Lựa chọn
                    </button>
                </div>
            </div>

            <!-- 3. Dynamic Answer Options & Correct Selection -->
            <div class="space-y-3 border-t border-slate-100 pt-5">
                <div class="flex items-center justify-between">
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Các đáp án & Chọn đáp án đúng <span class="text-red-500">*</span>
                    </label>
                    <span class="text-[11px] text-slate-400">Tích chọn một hoặc nhiều đáp án đúng</span>
                </div>

                <div class="space-y-3">
                    <div v-for="(option, index) in form.options" :key="index" :class="[
                        'p-3.5 rounded-xl border transition-all flex items-center space-x-3',
                        option.isCorrect
                            ? 'bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-200'
                            : 'bg-slate-50 border-slate-200'
                    ]">
                        <!-- Checkbox for Correct Answer Selection -->
                        <label class="flex items-center justify-center shrink-0 cursor-pointer"
                            title="Đánh dấu đáp án đúng">
                            <input type="checkbox" v-model="option.isCorrect"
                                class="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600" />
                        </label>

                        <!-- Option Input Field -->
                        <div class="flex-1 space-y-1">
                            <div class="relative">
                                <span
                                    class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                                    Lựa chọn {{ optionLabels[index] }}:
                                </span>
                                <input v-model="option.text" type="text"
                                    :placeholder="`Nhập nội dung cho đáp án ${optionLabels[index]}...`"
                                    class="w-full pl-24 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
                            </div>

                            <!-- Real-time KaTeX preview for answer option -->
                            <div v-if="option.text.includes('$')" class="text-xs text-slate-600 pl-2">
                                <span class="text-[10px] text-slate-400">Xem trước: </span>
                                <span v-html="renderOptionLatex(option.text)"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. Difficulty Selector -->
            <div class="border-t border-slate-100 pt-5">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Độ khó câu hỏi
                </label>
                <select v-model="form.difficulty"
                    class="w-full sm:w-64 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition">
                    <option value="EASY">Dễ (Easy)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="HARD">Khó (Hard)</option>
                </select>
            </div>

        </div>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" @click="goBack"
                class="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition">
                Hủy bỏ
            </button>
            <button type="button" @click="handleSubmit" :disabled="isLoading"
                class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center space-x-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ isEditMode ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi' }}</span>
            </button>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Editor from '@tinymce/tinymce-vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

interface AnswerOption {
    text: string
    isCorrect: boolean
}

const router = useRouter()
const route = useRoute()

const optionLabels = ['A', 'B', 'C', 'D', 'E']
const optionCount = ref<number>(4)
const errorMessage = ref<string>('')
const isLoading = ref<boolean>(false)

// Mode detection based on route parameters
const questionId = computed(() => route.params.questionId)
const isEditMode = computed(() => !!questionId.value)

const form = ref({
    content: '',
    difficulty: 'MEDIUM' as Difficulty,
    options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
    ] as AnswerOption[]
})

// TinyMCE Configuration
const tinyMceConfig = {
    height: 220,
    menubar: false,
    plugins: ['lists', 'link', 'image', 'table', 'code', 'help'],
    toolbar: 'undo redo | bold italic underline | bullist numlist | table link image | code',
    content_style: 'body { font-family:Inter,sans-serif; font-size:14px }',
    branding: false
}

// Fetch question details if in Edit Mode
onMounted(async () => {
    if (isEditMode.value) {
        isLoading.value = true
        try {
            // Replace mock data below with your actual API endpoint:
            // const response = await api.getQuestionDetail(questionId.value)
            
            const mockFetchedQuestion = {
                content: '<p>Chủ nghĩa duy vật biện chứng do ai sáng lập?</p>',
                difficulty: 'EASY' as Difficulty,
                options: [
                    { text: 'C. Mác và Ph. Ăng-ghen', isCorrect: true },
                    { text: 'V.I. Lênin', isCorrect: false },
                    { text: 'G.W.F. Hêghen', isCorrect: false },
                    { text: 'L. Phoi-ơ-bắc', isCorrect: false }
                ]
            }

            form.value.content = mockFetchedQuestion.content
            form.value.difficulty = mockFetchedQuestion.difficulty
            form.value.options = mockFetchedQuestion.options
            optionCount.value = mockFetchedQuestion.options.length
        } catch (error) {
            errorMessage.value = 'Khởi tạo dữ liệu câu hỏi thất bại.'
            console.error('Failed to load question detail:', error)
        } finally {
            isLoading.value = false
        }
    }
})

// Render KaTeX for main question editor
const renderedLatex = computed(() => {
    if (!form.value.content) return '<i>Chưa có nội dung...</i>'

    const tempDom = document.createElement('div')
    tempDom.innerHTML = form.value.content
    const rawText = tempDom.textContent || tempDom.innerText || ''

    try {
        return rawText.replace(/\$(.*?)\$/g, (_, equation) => {
            return katex.renderToString(equation, { throwOnError: false })
        })
    } catch {
        return rawText
    }
})

// Render KaTeX for answer options
const renderOptionLatex = (text: string) => {
    if (!text) return ''
    try {
        return text.replace(/\$(.*?)\$/g, (_, equation) => {
            return katex.renderToString(equation, { throwOnError: false })
        })
    } catch {
        return text
    }
}

const setOptionCount = (count: number) => {
    optionCount.value = count
    const currentLength = form.value.options.length

    if (count > currentLength) {
        for (let i = currentLength; i < count; i++) {
            form.value.options.push({ text: '', isCorrect: false })
        }
    } else if (count < currentLength) {
        form.value.options = form.value.options.slice(0, count)
    }
}

const validateForm = (): boolean => {
    errorMessage.value = ''

    if (!form.value.content.trim()) {
        errorMessage.value = 'Vui lòng nhập nội dung câu hỏi.'
        return false
    }

    for (let i = 0; i < form.value.options.length; i++) {
        if (!form.value.options[i].text.trim()) {
            errorMessage.value = `Vui lòng nhập nội dung cho Lựa chọn ${optionLabels[i]}.`
            return false
        }
    }

    const hasCorrectAnswer = form.value.options.some(opt => opt.isCorrect)
    if (!hasCorrectAnswer) {
        errorMessage.value = 'Vui lòng chọn ít nhất một đáp án đúng.'
        return false
    }

    return true
}

const handleSubmit = async () => {
    if (!validateForm()) return

    const payload = {
        bankId: route.params.id,
        content: form.value.content.trim(),
        difficulty: form.value.difficulty,
        options: form.value.options.map((opt, idx) => ({
            label: optionLabels[idx],
            text: opt.text.trim(),
            isCorrect: opt.isCorrect
        }))
    }

    isLoading.value = true

    try {
        if (isEditMode.value) {
            console.log(`Updating question ${questionId.value}:`, payload)
            // await api.updateQuestion(questionId.value, payload)
            alert('Đã cập nhật câu hỏi thành công!')
        } else {
            console.log('Creating new question:', payload)
            // await api.createQuestion(payload)
            alert('Đã tạo câu hỏi thành công!')
        }
        goBack()
    } catch (err) {
        errorMessage.value = 'Có lỗi xảy ra khi lưu câu hỏi.'
        console.error('Submit error:', err)
    } finally {
        isLoading.value = false
    }
}

const goBack = () => {
    router.push({
        name: 'TeacherQuestionBankDetail',
        params: { id: route.params.id || 1 }
    })
}
</script>