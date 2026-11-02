// @ts-nocheck
import type React from "react";

const CardWidth = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`container mx-auto bg-accent p-4 rounded-lg mt-16 ${className}`}
    >
      {children}
    </div>
  );
};

export default CardWidth;
