import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthSubmitButtonProps = {
  id: string;
  isLoading: boolean;
  label: string;
  loadingLabel: string;
};

export function AuthSubmitButton({
  id,
  isLoading,
  label,
  loadingLabel,
}: AuthSubmitButtonProps) {
  return (
    <Button
      id={id}
      type="submit"
      className="h-11 w-full gap-2 transition-[background-color,box-shadow,transform] duration-200 active:translate-y-px"
      disabled={isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}
