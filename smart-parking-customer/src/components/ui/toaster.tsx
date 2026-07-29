import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
    />
  )
}

export const toast = sonnerToast
