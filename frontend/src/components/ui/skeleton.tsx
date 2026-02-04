import { cn } from "./utils";

function Skeleton({ className, ...rest }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className="block w-full"
      style={{ animation: "skeleton-glow 2.2s ease-in-out infinite" }}
    >
      <div
        className={cn("bg-accent rounded-md w-full", className)}
        {...rest}
      />
    </div>
  );
}

export { Skeleton };
