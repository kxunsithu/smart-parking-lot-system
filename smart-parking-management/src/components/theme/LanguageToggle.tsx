import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-background/80 hover:bg-accent hover:text-accent-foreground transition-all shadow-xs"
      aria-label="Toggle language"
      onClick={toggleLanguage}
    >
      <Globe className="size-3.5 text-primary shrink-0" />
      <span className="uppercase tracking-wider">{language === "en" ? "EN" : "မြန်မာ"}</span>
    </Button>
  );
}
