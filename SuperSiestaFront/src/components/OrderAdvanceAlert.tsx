import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarClock, PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface OrderAdvanceAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function OrderAdvanceAlert({
  open,
  onOpenChange,
  onConfirm,
}: OrderAdvanceAlertProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-2xl border-amber-200 bg-background p-0 shadow-2xl sm:rounded-3xl">
        <div className="h-2 bg-amber-500" />
        <AlertDialogHeader className="min-w-0 items-center px-4 pt-5 text-center sm:px-6 sm:pt-7 sm:text-center">
          <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-amber-200 sm:h-14 sm:w-14">
            <CalendarClock className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="w-full break-words text-xl font-black leading-tight text-foreground sm:text-2xl">
            {t.checkout.advanceTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 w-full break-words rounded-2xl border border-amber-200 bg-amber-50 p-3 text-start text-sm font-medium leading-6 text-amber-950 sm:p-4 sm:text-base sm:leading-7">
            {t.checkout.advanceNotice}
          </AlertDialogDescription>
          <div className="flex w-full min-w-0 items-center gap-3 rounded-xl bg-muted/50 px-3 py-3 text-start sm:px-4">
            <PhoneCall className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="min-w-0 break-words text-sm font-semibold leading-5 text-foreground">
              {t.checkout.advanceCallout}
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 p-4 pt-4 sm:flex-row sm:gap-3 sm:space-x-0 sm:p-6 sm:pt-5">
          <AlertDialogCancel className="mt-0 min-h-11 w-full whitespace-normal rounded-xl border-2 px-3 py-2 text-center font-bold leading-snug text-foreground hover:bg-muted sm:flex-1">
            {t.checkout.cancelSelection}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="min-h-11 w-full whitespace-normal rounded-xl px-3 py-2 text-center font-bold leading-snug shadow-md transition-transform hover:shadow-lg active:scale-[0.98] sm:flex-1"
          >
            {t.checkout.confirmSelection}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
