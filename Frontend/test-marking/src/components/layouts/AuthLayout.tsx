import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BarChart3, BookOpenCheck, ClipboardCheck, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export function AuthLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const lastWheelTime = useRef(0);

  const currentLang = i18n.language;
  const isVi = !currentLang || currentLang.startsWith('vi');

  const features = [
    {
      icon: ClipboardCheck,
      label: isVi ? "Tạo Đề & Giao Bài" : "Fast Exam Workflow",
      desc: isVi 
        ? "Thiết lập đề thi từ nhiều nguồn và tự động chấm điểm OMR thông minh."
        : "Prepare exams from various formats and use smart OMR automatic grading.",
    },
    {
      icon: BookOpenCheck,
      label: isVi ? "Quản Lý Lớp Học" : "Classroom Management",
      desc: isVi 
        ? "Duyệt học sinh bằng mã tham gia lớp và quản lý danh sách học viên trực quan."
        : "Approve students using joining codes and manage rosters intuitively.",
    },
    {
      icon: BarChart3,
      label: isVi ? "Thống Kê Điểm Số" : "Scoring Statistics",
      desc: isVi 
        ? "Xem biểu đồ phổ điểm trực quan và đánh giá độ khó dễ của câu hỏi."
        : "Check visual grade distribution charts and analyze question difficulty.",
    },
    {
      icon: ShieldCheck,
      label: isVi ? "Giám Sát Phòng Thi" : "Exam Proctoring",
      desc: isVi 
        ? "Tự động cảnh báo khi học sinh rời màn hình hoặc nộp bài thi muộn."
        : "Get alerts when students leave the active screen or submit tests late.",
    },
  ];

  const dynamicIntros = [
    {
      title: isVi ? "Tạo Đề & Giao Bài Kiểm Tra Nhanh Chóng" : "Fast Exam Workflow & Delivery",
      desc: isVi 
        ? "Chuẩn bị đề thi từ nhiều nguồn, thiết lập ca thi chỉ trong vài giây. Học sinh làm bài trên mọi thiết bị và hệ thống tự động chấm điểm OMR thông minh."
        : "Prepare exams from various formats, select classes, and set timing. Students can take tests on any device with automatic smart OMR grading.",
    },
    {
      title: isVi ? "Quản Lý Lớp Học & Theo Dõi Sát Sao" : "Intuitive Class & Roster Management",
      desc: isVi 
        ? "Duyệt học sinh vào lớp nhanh chóng bằng mã tham gia. Thầy cô dễ dàng quản lý danh sách học sinh và nắm rõ quá trình làm bài của từng em."
        : "Approve students using simple entry codes. Stay updated on the learning path and roster of each student in your class.",
    },
    {
      title: isVi ? "Thống Kê Điểm Số & Phân Tích Chuyên Sâu" : "In-Depth Scoring Statistics & Analysis",
      desc: isVi 
        ? "Biểu đồ phân tích phổ điểm trực quan, đánh giá mức độ khó dễ của từng câu hỏi. Nhận diện học sinh tiến bộ và xuất bảng điểm nhanh chóng."
        : "Visual grade distribution charts and question difficulty analytics. Identify student progress trends and export grade sheets in one click.",
    },
    {
      title: isVi ? "Giám Sát Phòng Thi & Nhận Cảnh Báo Vi Phạm" : "Real-Time Exam Proctoring & Notifications",
      desc: isVi 
        ? "Theo dõi trực tiếp thời gian làm bài, tự động cảnh báo và ghi nhận vi phạm khi học sinh rời màn hình hoặc nộp bài muộn để bảo đảm tính công bằng."
        : "Track progress live, receive instant alerts when students leave the active tab, log violations, and get notified immediately upon submissions.",
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPaused, features.length]);

  useEffect(() => {
    // Clean up body styles that might have been injected by Radix UI dialogs
    // (e.g. from the logout confirm dialog unmounting abruptly on auth state redirect)
    document.body.style.removeProperty('pointer-events');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('margin-right');
    document.body.style.removeProperty('overflow');
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 250) return; // 250ms cooldown to make scrolling comfortable
    lastWheelTime.current = now;

    if (e.deltaY > 0) {
      setActiveIndex((prev) => (prev + 1) % features.length);
    } else if (e.deltaY < 0) {
      setActiveIndex((prev) => (prev - 1 + features.length) % features.length);
    }
  };

  const handleDragEnd = (_event: any, info: any) => {
    const threshold = 40; // 40px drag threshold is comfortable
    if (info.offset.y < -threshold) {
      // Dragged up -> Next slide
      setActiveIndex((prev) => (prev + 1) % features.length);
    } else if (info.offset.y > threshold) {
      // Dragged down -> Prev slide
      setActiveIndex((prev) => (prev - 1 + features.length) % features.length);
    }
  };

  return (
    <div className="fixed inset-0 m-0 flex h-dvh w-screen max-w-none overflow-hidden bg-background text-foreground dark:bg-[#0B1220]">
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative hidden h-dvh flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.08] bg-[#0E1729] lg:flex lg:w-[440px] xl:w-[520px]"
        style={{
          background:
            'radial-gradient(circle at 20% 12%, rgba(96,165,250,0.22), transparent 28%), linear-gradient(145deg, #0E1729 0%, #101827 52%, #172033 100%)',
        }}
      >
        <div className="relative z-10 px-8 pt-8 xl:px-10 xl:pt-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.08] shadow-lg shadow-black/20">
              <ScanLine className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-white">TestMarking</p>
              <p className="mt-0.5 text-xs text-white/55">
                {t('authLayout.appSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-8 py-8 animate-in fade-in-0 slide-in-from-bottom-3 space-y-6 duration-500 xl:px-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-medium text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              {t('authLayout.audience')}
            </div>
            <motion.h2 
              key={`title-${activeIndex}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="max-w-md text-3xl font-semibold leading-tight text-zinc-50 xl:text-4xl"
            >
              {dynamicIntros[activeIndex].title}
            </motion.h2>
            <motion.p 
              key={`desc-${activeIndex}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, ease: "easeOut", delay: 0.04 }}
              className="max-w-md text-sm leading-relaxed text-zinc-400 min-h-[64px]"
            >
              {dynamicIntros[activeIndex].desc}
            </motion.p>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <ul 
              onWheel={handleWheel}
              className="relative h-[300px] flex-1 overflow-hidden cursor-ns-resize"
            >
              {features.map((f, index) => {
                let diff = index - activeIndex;
                if (diff < -1) diff += features.length;
                if (diff > 2) diff -= features.length;

                const isActive = diff === 0;
                const isPrev = diff === -1;
                const isNext = diff === 1;

                return (
                  <motion.li
                    key={f.label}
                    onClick={() => setActiveIndex(index)}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.4}
                    onDragEnd={handleDragEnd}
                    style={{
                      position: 'absolute',
                      top: '108px',
                      left: 0,
                      right: 0,
                      width: '100%',
                      height: '84px',
                      cursor: 'grab',
                    }}
                    initial={{
                      y: diff * 100,
                      scale: isActive ? 1.05 : 0.95,
                      opacity: isActive ? 1 : (isPrev || isNext ? 0.45 : 0),
                    }}
                    animate={{
                      y: diff * 100,
                      scale: isActive ? 1.05 : 0.95,
                      opacity: isActive ? 1 : (isPrev || isNext ? 0.45 : 0),
                    }}
                    transition={{
                      y: { type: 'spring', stiffness: 150, damping: 22, mass: 0.8 },
                      opacity: { duration: isActive ? 0.35 : 0.2 },
                      scale: { duration: 0.3 },
                    }}
                    whileTap={{ cursor: 'grabbing' }}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-all duration-300 select-none ${
                      isActive
                        ? 'border-white/[0.18] bg-white/[0.09] shadow-[0_0_15px_rgba(59,130,246,0.12)] text-white'
                        : 'border-white/[0.04] bg-white/[0.015] text-zinc-400 hover:bg-white/[0.03] hover:border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-300 ${
                        isActive
                          ? 'border-white/[0.15] bg-white/[0.1] text-white'
                          : 'border-white/[0.06] bg-white/[0.04] text-zinc-300'
                      }`}
                    >
                      <f.icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isActive ? 'text-zinc-50' : 'text-zinc-300'
                        }`}
                      >
                        {f.label}
                      </p>
                      <p
                        className={`mt-0.5 text-xs transition-colors duration-300 line-clamp-2 ${
                          isActive ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {f.desc}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            {/* Vertical Dot Indicators */}
            <div className="flex flex-col gap-2 flex-shrink-0 pr-1 select-none">
              {features.map((_, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    className={`w-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'h-6 bg-white shadow-sm shadow-black/25'
                        : 'h-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <p className="relative z-10 px-8 pb-8 text-xs text-zinc-600 xl:px-10 xl:pb-10">
          &copy; {new Date().getFullYear()} {t('authLayout.copyright')}
        </p>
      </div>

      <div className="flex min-h-dvh lg:min-h-0 lg:h-full flex-1 flex-col items-center justify-center overflow-y-auto bg-[linear-gradient(180deg,var(--background),var(--surface-soft))] p-6 dark:bg-[linear-gradient(180deg,#0B1220,#111827)] sm:p-10">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <ScanLine className="h-6 w-6 text-primary" />
          <span className="font-semibold text-foreground">TestMarking</span>
        </div>

        <div className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 rounded-xl border border-border/70 bg-card/95 p-6 shadow-[var(--shadow-floating)] backdrop-blur transition-[opacity,transform] duration-500 dark:border-white/[0.08] dark:bg-[#111827]/95 sm:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
