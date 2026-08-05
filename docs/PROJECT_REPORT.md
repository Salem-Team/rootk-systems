# تقرير مشروع ROOTK Internal HR System  
## من الصفر حتى الحالة الحالية

**الشركة:** ROOTK Systems (شركة روتك للأنظمة)  
**المنتج:** نظام روتك الداخلي للموارد البشرية  
**النوع:** Frontend-only (جاهز للربط مع NestJS)  
**اللغة الافتراضية:** العربية (RTL) + الإنجليزية  
**تاريخ التقرير:** 3 أغسطس 2026  

---

## 1) ملخص تنفيذي

تم بناء نظام إدارة موارد بشرية داخلي كامل كواجهة أمامية احترافية لشركة ROOTK، يغطي الحضور، الموظفين، الجداول، الإجازات، التقارير، والإعدادات.

النظام يعمل حاليًا ببيانات تجريبية محلية (LocalStorage)، مع طبقة جاهزة للتبديل إلى Backend حقيقي عبر متغير بيئة واحد (`NEXT_PUBLIC_DATA_SOURCE=api`).

---

## 2) الهدف من المشروع

- بناء بوابة HR داخلية بهوية ROOTK (كحلي `#082868` + اللوجو الرسمي).
- تجربة استخدام جاهزة للعرض/الديمو بدون Backend.
- معمارية نظيفة تسمح بالربط لاحقًا مع NestJS + JWT بدون إعادة بناء الواجهة.
- دعم كامل للعربي/الإنجليزي ووضعي Admin و Employee.

---

## 3) التقنيات المستخدمة (Stack)

| الطبقة | التقنية |
| --- | --- |
| Framework | Next.js 15 (App Router) + Turbopack |
| UI | React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Radix |
| حركة | Framer Motion |
| رسوم بيانية | Recharts |
| جداول | TanStack Table |
| نماذج | React Hook Form + Zod |
| حالة العميل | Zustand (+ persist للجلسة) |
| ثيم | next-themes (فاتح/داكن/تلقائي) |
| تنبيهات | Sonner |
| أيقونات | Lucide React |
| تواريخ | date-fns · react-day-picker |

---

## 4) رحلة البناء من الصفر (مراحل العمل)

### المرحلة A — تأسيس المشروع
- إنشاء مشروع Next.js 15 داخل مجلد `rootk-systems`.
- تفعيل TypeScript، App Router، Tailwind، ESLint، `src/`.
- تثبيت مكتبات UI/State/Forms/Charts.
- إعداد shadcn/ui ونظام المكونات الأساسية.

### المرحلة B — الهوية والتصميم الأساسي
- تبني هوية ROOTK: لون كحلي من اللوجو `#082868`.
- خطوط: Plus Jakarta Sans + Noto Sans Arabic + Geist Mono.
- دعم RTL افتراضي (`lang="ar" dir="rtl"`).
- بناء Design Tokens في `globals.css` (ألوان، ظلال، radii، dark mode).
- إضافة شعار الشركة في `public/rootk-logo.png`.

### المرحلة C — هيكل التطبيق والشل
- Layout عام للتطبيق `(app)`.
- `AppShell`: Sidebar + Navbar + Mobile nav + Role banner.
- تنقل حسب الدور (Admin يرى Employees/Reports، Employee لا).
- تبديل اللغة AR/EN.
- تبديل الثيم.
- إشعارات منبثقة.
- شريط تقدم للتنقل بين الصفحات.

### المرحلة D — وحدات المنتج (Features)
تم بناء كل الشاشات التالية بواجهة تفاعلية كاملة:

1. **Dashboard** — KPIs، حضور اليوم، Charts أسبوعي/شهري، أنشطة، إعلانات، Quick Actions  
2. **Attendance** — Check-in/out، WFH، مؤقت حي، Timeline، History، لوحة فريق للأدمن  
3. **Employees** — دليل موظفين بفلاتر وGrid/Table  
4. **Schedule** — أيام العمل، ساعات، WFH، عطلات  
5. **Leave** — طلبات إجازة، موافقة/رفض، Tabs حسب الحالة  
6. **Reports** — إحصائيات وتحليلات وتصدير CSV  
7. **Settings** — بيانات الشركة، المظهر، الإشعارات، أدوات الديمو  

### المرحلة E — طبقة البيانات الوهمية (Fake Backend)
بدل ما تكون البيانات “hardcoded في الواجهة”، اتعمل Fake Backend منظم:

```
UI → Services → Repositories → Storage Adapter → LocalStorage
```

- Seed بيانات واقعية (موظفين، حضور، إجازات، جداول، إشعارات…).
- `SEED_VERSION` لإعادة تهيئة البيانات عند التحديث.
- تأخير وهمي لمحاكاة الشبكة.
- نماذج Zod للتحقق من المدخلات.
- أخطاء domain قياسية (Validation / NotFound / Conflict / Unauthorized…).

### المرحلة F — الأدوار والجلسة
- دورين: `admin` و `employee`.
- تبديل الدور من الواجهة (Role Switcher + Banner).
- كل دور يرى Dashboard ومسارات مختلفة.
- حماية المسارات الإدارية عبر RoleGate.

### المرحلة G — ترقية الديزاين للاحترافية
- إعادة ضبط Design System (أسطح أهدأ، ظلال أخف، أقل “AI glow”).
- ثيم افتراضي فاتح بدل الداكن.
- تحسين Brand Mark / Sidebar / Navbar / Page Header.
- إعادة تصميم Dashboard KPIs و Quick Actions و Check-in.
- إزالة التدرجات/الـ orbs الزائدة.
- تنظيف ألوان الحالة (بدل indigo/violet).

### المرحلة H — صفحة الدخول وتجربة البداية
- إضافة `/login` بهوية ROOTK كاملة.
- اختيار الدور ثم الدخول لمساحة العمل.
- `AuthGate` لحماية صفحات التطبيق.
- تسجيل خروج من قائمة المستخدم.
- الصفحة الرئيسية `/` توجّه حسب حالة الجلسة.

### المرحلة I — تجهيز الربط مع الباك إند
- نظام Dual-mode:
  - `local` = LocalStorage (الديمو)
  - `api` = HTTP إلى NestJS
- إنشاء طبقة `src/api/*` لكل الـ domains.
- تقوية `HttpClient` (JWT Bearer، Refresh، Mapping أخطاء Nest).
- جلسة فيها `accessToken` / `refreshToken`.
- ملفات بيئة: `.env.example` + `.env.local`.
- توثيق عقود الـ API في `docs/BACKEND_INTEGRATION.md`.

---

## 5) المسارات الحالية (Routes)

| المسار | الوصف | الوصول |
| --- | --- | --- |
| `/` | Redirect حسب الجلسة | عام |
| `/login` | دخول تجريبي باختيار الدور | غير مسجّل |
| `/dashboard` | لوحة التحكم | Admin + Employee |
| `/attendance` | الحضور والانصراف | Admin + Employee |
| `/employees` | دليل الموظفين | Admin |
| `/schedule` | جدول العمل والعطلات | Admin + Employee (عرض) |
| `/leave` | طلبات الإجازة | Admin + Employee |
| `/reports` | التقارير والتحليلات | Admin |
| `/settings` | إعدادات الشركة | Admin + Employee |

---

## 6) المعمارية الحالية

```
src/
├── api/                 # عملاء REST (وضع api)
├── app/                 # الصفحات والـ layouts
├── components/          # UI + Features + Layout
├── constants/           # هوية، تنقل، ألوان
├── hooks/               # hooks مشتركة
├── i18n/                # ترجمات AR/EN
├── lib/                 # env, http-client, errors, utils
├── mocks/               # بيانات البذرة
├── repositories/        # طبقة الدومين المحلية
├── schemas/             # Zod DTOs
├── services/            # واجهة ثابتة للـ UI (local|api)
├── storage/             # LocalStorage adapters + seed
├── stores/              # Zustand (session, attendance, ui…)
└── types/               # نماذج الدومين المشتركة
```

### تدفق البيانات

**وضع local (الافتراضي):**
```
Component → Service → Repository → LocalStorageAdapter → localStorage
```

**وضع api:**
```
Component → Service → src/api/* → HttpClient → NestJS (/api/...)
```

الواجهة لا تتغير؛ التبديل من خلال:

```env
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

---

## 7) الوحدات الوظيفية بالتفصيل

### 7.1 المصادقة والجلسة
- دخول تجريبي بالدور (`signInWithRole`).
- جاهزية دخول بالبريد/كلمة المرور (`signInWithCredentials`) لوضع api.
- تخزين JWT في session store.
- عند 401: محاولة Refresh ثم تسجيل خروج وتوجيه لـ `/login`.
- Header ثابت: `Authorization: Bearer …` + `X-Company-Id`.

### 7.2 الحضور (Attendance)
- Check-in / Check-out.
- وضع العمل من المنزل (WFH).
- حساب التأخير وساعات العمل مبكرًا (local mode).
- مؤقت جلسة حي.
- سجل زمني + تاريخ حضور.
- لوحة حضور الفريق للأدمن.

### 7.3 الموظفون
- بحث وتصفية بالقسم/الحالة/الموقع.
- عرض شبكي وجدول.
- بطاقات موظف بحالة الحضور الحالية.

### 7.4 الإجازات
- إنشاء طلب إجازة مع validation.
- موافقة/رفض مع ملاحظة المراجع.
- عدّاد الطلبات المعلقة في السايدبار.

### 7.5 الجدول
- أيام العمل وعطلة نهاية الأسبوع وWFH.
- ساعات الدوام وفترة السماح والاستراحة.
- إدارة العطلات.

### 7.6 التقارير
- إحصائيات حضور.
- Charts.
- فلاتر وتصدير CSV.

### 7.7 الإعدادات
- بيانات الشركة.
- اللغة والمظهر.
- تفضيلات الإشعارات.
- أدوات إعادة ضبط بيانات الديمو (local).

---

## 8) نظام التصميم (Design System)

- Brand Navy: `#082868`
- خلفية إدارية هادئة مع تدرج خفيف (مش flat أبيض).
- كروت/أسطح: `surface-panel` بظل خفيف وحدود ناعمة.
- مكونات shadcn مخصّصة (Button, Card, Dialog, Table…).
- حركة مدروسة (page transitions، sidebar active pill، counters).
- دعم `prefers-reduced-motion`.
- Dark mode كامل مع توكنات مستقلة.

---

## 9) التدويل (i18n)

- ملفات ترجمة: `src/i18n/locales/ar.ts` و `en.ts`.
- تبديل فوري من النافبار.
- اتجاه الصفحة RTL/LTR حسب اللغة.
- محتوى الديمو (أسماء/إعلانات/أنشطة) مترجم بمفاتيح i18n.

---

## 10) جاهزية الباك إند

### ما هو جاهز الآن
- سكافولد NestJS في `backend/` مع **خدمات Prisma حقيقية** للدومينات الأساسية + seed.
- `docker-compose` لـ PostgreSQL 16.
- عقود REST في `src/api/routes.ts` + عملاء API + dual-mode services في الفرونت.
- Auth من قاعدة البيانات (`demo-login` / `me`) بعد `npm run db:setup`.
- دليل الربط: `docs/BACKEND_INTEGRATION.md` + `backend/README.md`.

### المطلوب لاحقًا (تحسينات)
- كلمات مرور مجزأة + refresh tokens في جدول `RefreshToken`.
- Payslips / salary profiles كاملة بدل JSON stubs.
- Seed أغنى للحضور/الإجازات/المهام.
- `prisma migrate` بدل `db push` للإنتاج.

---

## 11) حجم المشروع الحالي (تقريبي)

- ~177 ملف TypeScript/TSX تحت `src/`
- وحدات رئيسية: app, components, services, repositories, api, storage, i18n, stores
- وثائق: README + BACKEND_INTEGRATION + هذا التقرير

---

## 12) طريقة التشغيل

```bash
cp .env.example .env.local
npm install
npm run dev
```

ثم افتح: [http://localhost:3000](http://localhost:3000)

- الدخول من `/login`
- اختر Admin أو Employee
- استكشف النظام

للتبديل إلى Backend:

```env
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

---

## 13) ما تم إنجازه بالكامل (Checklist)

- [x] إنشاء مشروع Next.js من الصفر
- [x] هوية ROOTK البصرية والخطوط واللوجو
- [x] Shell احترافي (Sidebar/Navbar/Mobile)
- [x] 7 وحدات HR كاملة
- [x] بيانات تجريبية واقعية + Seed/Reset
- [x] أدوار Admin/Employee
- [x] i18n عربي/إنجليزي RTL
- [x] ثيم فاتح/داكن
- [x] صفحة Login + حماية الجلسة
- [x] ترقية ديزاين احترافية
- [x] طبقة API جاهزة للباك إند
- [x] توثيق الربط مع NestJS
- [x] متغيرات بيئة `.env.example` / `.env.local`

---

## 14) ما لم يُبنَ بعد (متعمد / خارج نطاق الحالي)

- منطق Prisma الحقيقي داخل controllers (السكافولد الحالي يرجع stubs/empty)
- seed إنتاجي للموظفين/الحضور
- مصادقة إنتاجية كاملة (كلمات مرور مجزأة، refresh rotation في DB)
- رفع ملفات/صور حقيقية
- اختبارات E2E/Unit شاملة
- نشر Production (Vercel/Docker API) — البنية جاهزة لكن غير منفّذة كـ Deploy

---

## 15) الخلاصة

المشروع بدأ من صفر كـ Next.js app، واتبنى كمنتج HR داخلي متكامل بهوية ROOTK، بواجهة ثنائية اللغة، وأدوار مختلفة، وبيانات ديمو غنية، ثم اترفع مستواه البصري، واتقفلت تجربة الدخول، وأخيرًا اتجهّزت طبقة الربط مع الباك إند بحيث التحويل من الديمو إلى الإنتاج يبقى تغيير إعدادات وليس إعادة بناء.

**الحالة الحالية:** Frontend جاهز للعرض والاستخدام التجريبي، وجاهز للربط مع NestJS عند توفر الـ API.
