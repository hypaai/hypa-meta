const CardWidth = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`container mx-auto bg-[var(--accent)] p-4 rounded-lg mt-16 ${className}`}
  >
    {children}
  </div>
);

export default CardWidth;
