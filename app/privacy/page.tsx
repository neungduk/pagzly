import Link from "next/link";
import PagzlyLogo from "@/components/PagzlyLogo";

const ARTICLES: { title: string; body: string }[] = [
  {
    title: "제1조 (수집하는 개인정보 항목 및 수집 방법)",
    body: `1. 회사는 회원가입 및 서비스 제공을 위해 다음의 개인정보를 수집합니다.
   - 필수 항목: 이메일 주소, 비밀번호(암호화 저장)
   - 서비스 이용 과정에서 생성·수집되는 정보: 업로드한 상품 사진, 상품명·브랜드명·가격·타겟 고객 등 상품 정보, 생성된 상세페이지 콘텐츠, 서비스 이용 기록·접속 로그·이용 요금 정보
2. 개인정보는 회원가입, 서비스 이용, 고객 문의 응대 과정에서 이용자가 직접 입력하거나 서비스 이용 중 자동으로 생성되어 수집됩니다.`,
  },
  {
    title: "제2조 (개인정보의 수집 및 이용 목적)",
    body: `회사는 수집한 개인정보를 다음의 목적을 위해 이용합니다.
1. 회원 가입 의사 확인, 본인 식별, 서비스 부정 이용 방지
2. AI를 이용한 상세페이지 생성 서비스 제공 및 결과물 저장·관리
3. 서비스 이용 기록 분석을 통한 서비스 개선 및 신규 기능 개발
4. 고객 문의 응대 및 공지사항 전달`,
  },
  {
    title: "제3조 (개인정보의 보유 및 이용 기간)",
    body: `회사는 원칙적으로 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만 회원 탈퇴 후에도 부정 이용 방지를 위해 일정 기간 보관이 필요한 정보 또는 관계 법령에 따라 보존할 의무가 있는 정보는 아래와 같이 보관합니다.
   - 전자상거래 등에서의 소비자 보호에 관한 법률에 따른 계약 또는 청약철회 등에 관한 기록: 5년
   - 대금결제 및 재화 등의 공급에 관한 기록: 5년
   - 통신비밀보호법에 따른 로그인 기록: 3개월`,
  },
  {
    title: "제4조 (개인정보 처리 위탁)",
    body: `회사는 원활한 서비스 제공을 위해 아래 업체에 개인정보 처리를 위탁하고 있으며, 위탁 업무는 서비스 제공에 필요한 최소한의 범위(업로드된 상품 사진, 상품 정보 텍스트)로 한정됩니다. 수탁업체는 모두 해외 사업자입니다.
   - Supabase: 회원 인증, 데이터베이스 및 파일(상품 사진·생성물) 저장
   - Anthropic(Claude): 업로드 이미지 분석 및 생성 콘텐츠 품질 검수
   - DeepSeek: 상세페이지 문구(카피) 자동 생성
   - Bria / Replicate: 상품 배경 이미지 합성 및 보정`,
  },
  {
    title: "제5조 (개인정보의 제3자 제공)",
    body: `회사는 이용자의 개인정보를 제1조에서 고지한 범위를 초과하여 제3자에게 제공하지 않습니다. 다만 법령에 근거가 있거나 수사기관이 법령에 정해진 절차에 따라 요구하는 경우는 예외로 합니다.`,
  },
  {
    title: "제6조 (이용자의 권리와 행사 방법)",
    body: `이용자는 언제든지 자신의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴를 통해 개인정보 수집·이용에 대한 동의를 철회할 수 있습니다. 개인정보 열람·정정·삭제·처리정지를 원하는 경우 제9조의 연락처로 요청할 수 있으며, 회사는 지체 없이 조치합니다.`,
  },
  {
    title: "제7조 (개인정보의 파기)",
    body: `회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 영구 삭제합니다.`,
  },
  {
    title: "제8조 (개인정보의 안전성 확보 조치)",
    body: `회사는 개인정보의 안전성 확보를 위해 비밀번호 암호화, 접근 권한 관리, 데이터 전송 구간 암호화(SSL) 등의 조치를 취하고 있습니다.`,
  },
  {
    title: "제9조 (개인정보 보호책임자)",
    body: `회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
   - 담당자: [담당자명 입력]
   - 이메일: tjsmdejr@gmail.com`,
  },
  {
    title: "제10조 (고지의 의무)",
    body: `이 개인정보처리방침의 내용 추가, 삭제 및 수정이 있는 경우 시행 최소 7일 전에 서비스 화면을 통해 공지합니다.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" aria-label="Pagzly 홈">
            <PagzlyLogo className="h-6 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-ink/50 transition-colors hover:text-ink">
            홈으로
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-heading text-2xl font-semibold text-ink sm:text-3xl">
          개인정보처리방침
        </h1>
        <p className="mt-2 font-mono text-xs text-ink/40">시행일 2026년 8월 20일</p>
        <p className="mt-6 text-sm leading-relaxed text-ink/70">
          Pagzly(이하 &quot;회사&quot;)는 「개인정보 보호법」 등 관련 법령을 준수하며,
          이용자의 개인정보를 안전하게 처리하기 위해 다음과 같이 개인정보처리방침을
          수립·공개합니다.
        </p>

        <div className="mt-12 space-y-10">
          {ARTICLES.map((article) => (
            <section key={article.title}>
              <h2 className="text-base font-semibold text-ink">{article.title}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/70">
                {article.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-line pt-8 font-mono text-xs text-ink/40">
          부칙 — 이 방침은 2026년 8월 20일부터 시행합니다.
        </p>
      </main>
    </div>
  );
}
