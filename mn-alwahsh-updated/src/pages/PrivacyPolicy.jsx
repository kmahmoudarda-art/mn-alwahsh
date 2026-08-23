import { Link } from 'react-router-dom';

const updated = '24 August 2026';

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#050000', padding: '32px 16px' }}>
      <div dir="rtl" style={{
        maxWidth: 720, margin: '0 auto',
        background: 'linear-gradient(135deg, #1a0000, #0a0000)',
        border: '1px solid rgba(255,215,0,0.25)', borderRadius: 16,
        padding: '32px 24px', color: '#FFE4E4',
        fontFamily: 'var(--font-tajawal, sans-serif)', lineHeight: 1.9, fontSize: 14.5,
      }}>
        <h1 style={{ fontFamily: 'var(--font-cairo, sans-serif)', fontWeight: 800, fontSize: 24, color: '#FFD700', marginBottom: 4 }}>
          سياسة الخصوصية — من الوحش
        </h1>
        <p style={{ color: 'rgba(255,150,150,0.7)', fontSize: 12.5, marginBottom: 24 }}>
          آخر تحديث: {updated}
        </p>

        <Section title="ما هي البيانات التي نجمعها؟">
          <p><b>عند إنشاء حساب:</b> بريدك الإلكتروني وكلمة المرور، عبر خدمة المصادقة (Supabase Auth). لا نطلب اسمك الحقيقي أو رقم هاتفك لإنشاء حساب.</p>
          <p><b>عند اللعب كضيف بدون حساب:</b> فقط اسم اللعبة الذي تكتبه بنفسه (لا يرتبط بهويتك).</p>
          <p><b>بيانات الجلسة:</b> عند بدء لعبة، نسجّل اسم اللعبة، أسماء الفريقين، الفئات المختارة، والنتيجة النهائية — بالإضافة إلى عنوان IP والمدينة والمنطقة والدولة المشتقة منه (لأغراض إحصائية عامة عن مواقع اللاعبين، وليس لتتبع فرد بعينه).</p>
          <p><b>المشتريات:</b> عند شراء فئة مميزة، نسجّل الفئة المشتراة وربطها بحسابك — لا نخزّن أبداً بيانات بطاقتك البنكية؛ الدفع يتم بالكامل عبر مزوّد الدفع (Ziina على الموقع، Google Play على تطبيق أندرويد) الذي يتولى معالجة معلومات الدفع بشكل مباشر.</p>
          <p><b>الإبلاغ عن الأسئلة:</b> عند استخدام زر "إبلاغ عن خطأ"، نسجّل فقط أن هذا السؤال تم الإبلاغ عنه من هذا الجهاز — بدون ربط ذلك بهويتك.</p>
        </Section>

        <Section title="التخزين المحلي على جهازك">
          <p>يستخدم الموقع مساحة التخزين المحلي في متصفحك (localStorage) لحفظ: تقدّم اللعبة الحالية لتتمكن من استكمالها، قائمة الأسئلة التي أبلغت عنها من هذا الجهاز، وإذا فعّلت خيار "تذكرني" عند تسجيل الدخول — بريدك الإلكتروني وكلمة المرور يُحفظان محلياً على جهازك لتسهيل الدخول لاحقاً. هذه البيانات تبقى على جهازك ولا تُرسل لنا إلا عند تسجيل الدخول الفعلي.</p>
        </Section>

        <Section title="من يشارك بياناتك؟">
          <p>لا نبيع بياناتك لأي طرف، ولا نستخدم إعلانات تتبّعية. البيانات تُشارك فقط مع مزوّدي الخدمات الضروريين لتشغيل اللعبة:</p>
          <ul style={{ margin: '4px 0 4px 0', paddingRight: 20 }}>
            <li>Supabase — لتخزين الحساب وقاعدة البيانات.</li>
            <li>Netlify — لاستضافة الموقع.</li>
            <li>Ziina — لمعالجة المدفوعات على الموقع.</li>
            <li>Google Play Billing — لمعالجة المدفوعات داخل تطبيق أندرويد.</li>
            <li>ipapi.co — لتحديد المدينة/الدولة من عنوان IP عند بدء لعبة (لأغراض إحصائية فقط).</li>
          </ul>
        </Section>

        <Section title="الأطفال">
          <p>تحتوي اللعبة على فئات مخصصة للأطفال، لكنها موجهة بشكل عام لجميع الأعمار وتُلعب عادة تحت إشراف الأهل. لا نجمع عن قصد أي بيانات شخصية تحدد الهوية من الأطفال دون سن 13 عاماً بما يتجاوز ما هو موضح أعلاه (بريد إلكتروني عند التسجيل، إن وُجد).</p>
        </Section>

        <Section title="حذف بياناتك">
          <p>يمكنك طلب حذف حسابك وجميع البيانات المرتبطة به بالتواصل معنا عبر البريد الإلكتروني أدناه.</p>
        </Section>

        <Section title="تغييرات على هذه السياسة">
          <p>قد نحدّث هذه السياسة من وقت لآخر. سيظهر تاريخ آخر تحديث دائماً أعلى هذه الصفحة.</p>
        </Section>

        <Section title="تواصل معنا">
          <p>لأي استفسار حول الخصوصية أو لطلب حذف بياناتك: <a href="mailto:Khalidarda.111@hotmail.com" style={{ color: '#FFD700' }}>Khalidarda.111@hotmail.com</a></p>
        </Section>

        <Link to="/" style={{ display: 'inline-block', marginTop: 16, color: '#FF9999', fontSize: 13 }}>
          ← العودة إلى اللعبة
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: 'var(--font-cairo, sans-serif)', fontWeight: 700, fontSize: 16, color: '#FF9999', marginBottom: 8 }}>
        {title}
      </h2>
      <div style={{ color: '#FFE4E4' }}>{children}</div>
    </div>
  );
}
