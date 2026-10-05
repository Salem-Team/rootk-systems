import { TECHNICAL_PROPOSAL_NOTE } from "@/lib/crm/technical-proposal";
import type {
  CrmClientRequestKind,
  TechnicalProposalDocument,
  TechnicalProposalSection,
} from "@/types/crm";

type TemplateInput = {
  kind: CrmClientRequestKind;
  leadName: string;
  message: string;
  listedPrice?: string;
  requestedPrice?: string;
};

function text(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed || fallback;
}

function section(
  id: string,
  title: string,
  intro: string,
  bullets: string[]
): TechnicalProposalSection {
  return { id, title, intro, bullets };
}

export function buildManagementTemplate(
  input: TemplateInput
): TechnicalProposalDocument {
  const client = text(input.leadName, "العميل");
  const request = text(input.message, "حسب طلب فريق المبيعات.");

  if (input.kind === "price_exception") {
    return {
      title: "موافقة استثناء سعر",
      subtitle: client,
      intro: `بناءً على طلب فريق المبيعات بخصوص ${client}، راجعت الإدارة استثناء السعر التالي.`,
      sections: [
        section("price-request", "تفاصيل الطلب", request, [
          `السعر الحالي: ${text(input.listedPrice, "—")}`,
          `السعر المطلوب: ${text(input.requestedPrice, "—")}`,
        ]),
        section(
          "price-decision",
          "قرار الإدارة",
          "تمت الموافقة على الاستثناء بالشروط التالية. عدّل القرار لو الرفض، أو لو السعر المعتمد مختلف.",
          [
            "السعر المعتمد: ",
            "يسري على هذا العميل فقط",
            "لا يُعمَّم على عروض أو عملاء آخرين",
            "صالح حتى: ",
          ]
        ),
        section("price-terms", "الشروط", "", [
          "السداد يتم وفق الاتفاق المكتوب مع العميل",
          "أي تغيير في نطاق العمل يعيد التسعير",
          "الاستثناء يسقط لو العرض لم يُعتمد خلال مدة الصلاحية",
        ]),
      ],
      noteTitle: "ملاحظة",
      note: "هذا الاستثناء خاص بهذا العميل ولا يُعتبر سابقة تسعير لباقي العملاء.",
    };
  }

  if (input.kind === "contract") {
    return {
      title: "مسودة عقد",
      subtitle: client,
      intro: `مسودة عقد تقديم خدمات برمجية بين روتك والعميل ${client}. عدّل البنود قبل الإرسال.`,
      sections: [
        section("contract-parties", "أطراف العقد", "", [
          "الطرف الأول: روتك",
          `الطرف الثاني: ${client}`,
        ]),
        section("contract-scope", "نطاق العمل", request, [
          "تنفيذ النطاق الموضح في هذا العقد والملحق الفني المرتبط به",
          "أي عمل خارج هذا النطاق يُتفق عليه في ملحق مستقل",
        ]),
        section("contract-payment", "القيمة وجدول السداد", "", [
          "القيمة الإجمالية: ",
          "دفعة التعاقد: ",
          "دفعة التسليم: ",
          "العملة: جنيه مصري",
        ]),
        section("contract-duration", "مدة التنفيذ", "", [
          "تبدأ المدة من تاريخ استلام الدفعة الأولى والبيانات المطلوبة",
          "مدة التنفيذ المتوقعة: ",
        ]),
        section("contract-duties", "الالتزامات", "", [
          "يلتزم الطرف الأول بالتنفيذ وفق النطاق المتفق عليه",
          "يلتزم الطرف الثاني بتوفير البيانات واعتماد المراحل في وقتها",
          "الدعم بعد التسليم يتم وفق المدة المذكورة في العقد",
        ]),
      ],
      noteTitle: "تنويه",
      note: "هذه مسودة للمراجعة، ولا تُعد عقدًا نافذًا إلا بعد موافقة الطرفين والتوقيع.",
    };
  }

  return {
    title: "الملحق الفني",
    subtitle: client,
    intro: `يوضّح هذا الملحق نطاق العمل الفني المقترح للعميل ${client}.`,
    sections: [
      section("proposal-scope", "نطاق العمل", request, [
        "تحليل الاحتياج واعتماد النطاق قبل بدء التنفيذ",
        "تسليم النظام وفق الأقسام الموضحة في هذا الملحق",
      ]),
      section("proposal-modules", "ما يشمله العرض", "", [
        "الشاشات والصلاحيات الأساسية للنظام",
        "تقارير التشغيل المتفق عليها",
        "تدريب مختصر لمستخدمي العميل",
      ]),
      section("proposal-out", "ما لا يشمله العرض", "", [
        "أي تكامل خارجي غير مذكور صراحة",
        "تطبيقات أو مواقع إضافية خارج النطاق",
        "استضافة أو نطاق خارج الاتفاق",
      ]),
      section("proposal-time", "مدة التنفيذ", "", [
        "مدة التنفيذ المتوقعة: ",
        "المراحل تُعتمد مع العميل قبل الانتقال للمرحلة التالية",
      ]),
    ],
    noteTitle: "ملاحظة",
    note: TECHNICAL_PROPOSAL_NOTE,
  };
}
