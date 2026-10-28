import { cn } from "@/components/ui/utils";

interface ArUcoMarkerProps {
  className?: string;
}

export function ArUcoMarker({ className }: ArUcoMarkerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-6 w-6 items-center justify-center bg-black p-1",
        className
      )}
    >
      <div className="grid h-full w-full grid-cols-2 gap-px bg-white">
        <div className="bg-black" />
        <div className="bg-white" />
        <div className="bg-white" />
        <div className="bg-black" />
      </div>
    </div>
  );
}
