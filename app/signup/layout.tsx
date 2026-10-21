import type { Metadata } from "next";
import type { ReactNode } from "react";

// 426차 W11: 페이지가 클라이언트 컴포넌트라 metadata는 라우트 layout에서 내보낸다
export const metadata: Metadata = {
  title: "회원가입",
  description: "무료로 가입하고 AI 상세페이지를 만들어 보세요.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
