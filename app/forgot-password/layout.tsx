import type { Metadata } from "next";
import type { ReactNode } from "react";

// 426차 W11: 페이지가 클라이언트 컴포넌트라 metadata는 라우트 layout에서 내보낸다
export const metadata: Metadata = {
  title: "비밀번호 찾기",
  description: "가입한 이메일로 비밀번호 재설정 링크를 받으세요.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
