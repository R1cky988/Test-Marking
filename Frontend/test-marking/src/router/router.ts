import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'main',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/teacher',
    component: () => import('@/views/teacher/teacher-layout/TeacherLayout.vue'),
    meta: { breadcrumb: 'Trang giảng viên' },
    children: [
      {
        path: 'classes',
        name: 'TeacherClasses',
        component: () => import('@/views/teacher/class/Class.vue'),
        meta: { title: 'Quản lý Lớp học', breadcrumb: 'Danh sách lớp học' }
      },
      {
        path: 'classes/:uuid',
        name: 'TeacherClassDetail',
        component: () => import('@/views/teacher/class/ClassDetail.vue'),
        meta: { 
          title: 'Chi tiết Lớp học', 
          breadcrumb: (route: RouteLocationNormalized) => route.meta.className || 'Chi tiết lớp học' 
        }
      },
      {
        path: 'exams',
        name: 'TeacherExams',
        component: () => import('@/views/teacher/examination/Examination.vue'),
        meta: { title: 'Quản lý Kỳ thi', breadcrumb: 'Danh sách kỳ thi' }
      },
    //   {
    //     path: 'exams/create',
    //     name: 'TeacherExamCreate',
    //     component: () => import('@/views/teacher/ExamCreateView.vue'),
    //     meta: { title: 'Tạo Kỳ thi Mới', breadcrumb: 'Tạo kỳ thi' }
    //   },
      {
        path: 'exams/detail/:uuid',
        name: 'TeacherExamDetail',
        component: () => import('@/views/teacher/examination/ExaminationDetail.vue'),
        meta: { 
          title: 'Chi tiết Kỳ thi', 
          breadcrumb: 'Chi tiết kỳ thi' 
        }
      },
      {
        path: 'question-bank',
        name: 'TeacherQuestionBank',
        component: () => import('@/views/teacher/question-bank/QuestionBank.vue'),
        meta: { title: 'Ngân hàng Câu hỏi', breadcrumb: 'Ngân hàng câu hỏi' }
      },
      {
        path: 'question-bank/detail/:uuid',
        name: 'TeacherQuestionBankDetail',
        component: () => import('@/views/teacher/question-bank/QuestionBankDetail.vue'),
        meta: { title: 'Chi tiết ngân hàng câu hỏi', breadcrumb: 'Chi tiết ngân hàng câu hỏi' }
      },
      {
        path: 'question-bank/detail/:uuid/create-question',
        name: 'TeacherCreateQuestion',
        component: () => import('@/views/teacher/question-bank/QuestionFormView.vue'),
        meta: {title: 'Tạo câu hỏi', breadcrumb: 'Tạo câu hỏi'}
      },
      {
        path: 'question-bank/:uuid/question/:questionId/edit',
        name: 'TeacherEditQuestion',
        component: () => import('@/views/teacher/question-bank/QuestionFormView.vue'),
        meta: { title: 'Sửa câu hỏi', breadcrumb: 'Sửa câu hỏi' }
      },
      {
        path: 'templates',
        name: 'TeacherTemplates',
        component: () => import('@/views/teacher/template/Template.vue'),
        meta: { title: 'Quản lý Mẫu phiếu OMR', breadcrumb: 'Mẫu phiếu OMR' }
      },
      {
        path: 'account',
        name: "TeacherAccount",
        component: () => import('@/views/teacher/account/Account.vue'),
        meta: { title: 'Quản lý tài khoản', breadcrumb: 'Mẫu phiếu OMR' }
      }
    ]
  },

  // ==========================================
  // 2. STUDENT PORTAL (Self-Upload & Results)
  // ==========================================
//   {
//     path: '/student',
//     component: () => import('@/layouts/StudentLayout.vue'),
//     meta: { breadcrumb: 'Trang sinh viên' },
//     children: [
//       {
//         path: '',
//         name: 'StudentDashboard',
//         component: () => import('@/views/student/StudentDashboardView.vue'),
//         meta: { title: 'Trang cá nhân', breadcrumb: 'Cá nhân' }
//       },
//       {
//         path: 'exams',
//         name: 'StudentExams',
//         component: () => import('@/views/student/StudentExamsView.vue'),
//         meta: { title: 'Danh sách Bài thi', breadcrumb: 'Bài thi của tôi' }
//       },
//       {
//         path: 'submissions/:uuid',
//         name: 'StudentSubmissionDetail',
//         component: () => import('@/views/student/StudentSubmissionDetailView.vue'),
//         meta: { 
//           title: 'Chi tiết Kết quả Bài làm', 
//           breadcrumb: (route: RouteLocationNormalized) => `Kết quả #${route.params.uuid}` 
//         }
//       }
//     ]
//   },

  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: 'Đăng nhập', breadcrumb: 'Đăng nhập' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { title: 'Đăng ký', breadcrumb: 'Đăng ký' }
  },

  // 404 Fallback
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: 'Không tìm thấy trang', breadcrumb: '404' }
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Dynamic Document Title Guard
router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - TestMarking`
  } else {
    document.title = 'TestMarking - Hệ thống chấm thi OMR'
  }
  next()
})