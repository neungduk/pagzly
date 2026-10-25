import { IconCheck, IconMinus } from "@tabler/icons-react";
import CropMarks from "@/components/CropMarks";

type Row = {
  label: string;
  outsourcing: string;
  template: string;
  pagzly: string;
};

// 427차: 시간·비용을 구체 숫자로 비교하지 않는다(근거 없는 수치는 표시광고 위험). 각 방식이 실제로 하는 일을 설명한다.
const rows: Row[] = [
  {
    label: "진행 방식",
    outsourcing: "의뢰 후 시안·수정을 주고받음",
    template: "템플릿에 직접 채움",
    pagzly: "사진·정보 입력으로 자동 구성",
  },
  {
    label: "비용 구조",
    outsourcing: "의뢰 조건에 따라 다름",
    template: "구독료 (직접 편집 필요)",
    pagzly: "토큰 차감 (요금제 참고)",
  },
  {
    label: "색·톤 매칭 방식",
    outsourcing: "디자이너와 직접 소통·조율",
    template: "직접 색상 선택",
    pagzly: "상품 사진에서 색상 자동 추출",
  },
  {
    label: "수정 방식",
    outsourcing: "수정 요청을 전달",
    template: "직접 편집",
    pagzly: "정보 변경 후 재생성·직접 편집",
  },
];

const cellClass = "px-3 py-5 align-top sm:px-5";
const bodyTextClass = "font-mono text-[11px] leading-relaxed break-keep sm:text-sm";

function MinusCell({ children }: { children: string }) {
  return (
    <span className="flex items-start gap-1.5">
      <IconMinus size={14} stroke={2.5} className="mt-0.5 shrink-0 text-ink/30" />
      {children}
    </span>
  );
}

function CheckCell({ children }: { children: string }) {
  return (
    <span className="flex items-start gap-1.5">
      <IconCheck size={14} stroke={2.5} className="mt-0.5 shrink-0 text-registration-red" />
      {children}
    </span>
  );
}

export default function ComparisonTable() {
  return (
    <div>
      <div className="relative mx-auto max-w-4xl">
        <CropMarks />
        <div className="overflow-hidden rounded-[4px] border border-line bg-white">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "34%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-line">
                <th className={`${cellClass} text-xs font-semibold text-ink/40 sm:text-sm`}>
                  <span className="sr-only">비교 항목</span>
                </th>
                <th className={`${cellClass} bg-white text-xs font-semibold text-ink break-keep sm:text-sm`}>
                  디자인 외주
                </th>
                <th className={`${cellClass} bg-white text-xs font-semibold text-ink break-keep sm:text-sm`}>
                  템플릿 툴
                </th>
                <th className={`${cellClass} bg-registration-red`}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-paper sm:text-sm">
                      Pagzly
                    </span>
                    <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[9px] font-semibold text-registration-red">
                      추천
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${i}-${row.label}`}
                  className={i !== rows.length - 1 ? "border-b border-line" : ""}
                >
                  <th
                    scope="row"
                    className={`${cellClass} text-xs font-semibold text-ink break-keep sm:text-sm`}
                  >
                    {row.label}
                  </th>
                  <td className={`${cellClass} bg-white text-ink/70 ${bodyTextClass}`}>
                    <MinusCell>{row.outsourcing}</MinusCell>
                  </td>
                  <td className={`${cellClass} bg-white text-ink/70 ${bodyTextClass}`}>
                    <MinusCell>{row.template}</MinusCell>
                  </td>
                  <td
                    className={`${cellClass} bg-[#F5DEDE] font-semibold text-registration-red ${bodyTextClass}`}
                  >
                    <CheckCell>{row.pagzly}</CheckCell>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-4xl px-1 text-xs leading-relaxed text-ink/40">
        * 일반적인 작업 방식을 설명한 것이며, 업체·서비스에 따라 다를 수 있습니다.
      </p>
    </div>
  );
}
