import { cn } from "./utils";

function Skeleton({ className, ...rest }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("app-skeleton", className)}
      {...rest}
    />
  );
}

export { Skeleton };
