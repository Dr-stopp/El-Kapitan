import React from "react";

export default function BrandMark(props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="32" cy="32" r="20" />
      <path d="M12 12l12 12" />
      <path d="M52 12 40 24" />
      <path d="M12 52l12-12" />
      <path d="M52 52 40 40" />
      <path d="M32 10v44" />
    </svg>
  );
}
