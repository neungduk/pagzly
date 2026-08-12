type PagzlyLogoProps = {
  variant?: "compact" | "full";
  className?: string;
};

const markPaths = (
  <>
    <rect width="32" height="32" rx="8" fill="#6366f1" />
    <rect
      x="7"
      y="7"
      width="13"
      height="17"
      rx="2"
      fill="white"
      fillOpacity="0.95"
    />
    <path
      d="M10 12H17"
      stroke="#6366f1"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10 15.5H15.5"
      stroke="#6366f1"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10 19H13.5"
      stroke="#6366f1"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M19.5 9L17 15.5H19L16.5 22L22.5 14.5H20.5L19.5 9Z"
      fill="#FDE047"
    />
    <path
      d="M25.5 6.5L26.3 8.3L28.2 9.1L26.3 9.9L25.5 11.7L24.7 9.9L22.8 9.1L24.7 8.3L25.5 6.5Z"
      fill="#FDE047"
    />
    <circle cx="24" cy="20" r="1" fill="#FDE047" />
    <circle cx="26.5" cy="17" r="0.75" fill="#FDE047" fillOpacity="0.7" />
  </>
);

export default function PagzlyLogo({
  variant = "compact",
  className = "",
}: PagzlyLogoProps) {
  if (variant === "full") {
    return (
      <svg
        viewBox="0 0 280 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Pagzly — 눈부시게 팔리는 페이지"
      >
        <rect width="40" height="40" x="0" y="8" rx="10" fill="#6366f1" />
        <rect
          x="9"
          y="15"
          width="16"
          height="21"
          rx="2.5"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M13 21H21"
          stroke="#6366f1"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M13 25H19"
          stroke="#6366f1"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M13 29H16.5"
          stroke="#6366f1"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M24 13L21 21.5H23.5L20 32L28 21H25.5L24 13Z"
          fill="#FDE047"
        />
        <path
          d="M32 10L33 12.5L35.5 13.5L33 14.5L32 17L31 14.5L28.5 13.5L31 12.5L32 10Z"
          fill="#FDE047"
        />
        <circle cx="30" cy="26" r="1.25" fill="#FDE047" />
        <text
          x="52"
          y="34"
          fill="#111827"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="24"
          fontWeight="700"
          letterSpacing="-0.02em"
        >
          Pagzly
        </text>
        <text
          x="52"
          y="50"
          fill="#6366f1"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="11"
          fontWeight="500"
        >
          눈부시게 팔리는 페이지
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 120 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Pagzly"
    >
      {markPaths}
      <text
        x="40"
        y="22"
        fill="#111827"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="18"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        Pagzly
      </text>
    </svg>
  );
}
