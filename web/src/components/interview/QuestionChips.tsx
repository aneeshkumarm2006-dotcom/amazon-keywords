import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { CATEGORY_META, LEVEL_META, type InterviewEntry } from "@/content/interviews";
import { cn } from "@/lib/utils";

import { categoryIcon, formatDuration } from "./meta";

export interface QuestionChipsProps {
  entry: InterviewEntry;
  /** Hide the category chip on surfaces already grouped by category. */
  hideCategory?: boolean;
  /** Adds the source-bank provenance chip. */
  showSource?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * The standard metadata row for a question: category, level, spoken length and
 * optionally where it came from in the source bank.
 */
export function QuestionChips({
  entry,
  hideCategory,
  showSource,
  size = "sm",
  className,
}: QuestionChipsProps) {
  const category = CATEGORY_META[entry.category];
  const level = LEVEL_META[entry.level];
  const Icon = categoryIcon(entry.category);

  // A span rather than a div: this row renders inside the bank browser's
  // expand button, whose content model only allows phrasing content.
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {hideCategory ? null : (
        <Badge tone={category.tone} size={size} icon={Icon}>
          {category.short}
        </Badge>
      )}
      <Badge tone={level.tone} size={size} variant="outline">
        {level.label}
      </Badge>
      <Badge tone="neutral" size={size} icon={Clock}>
        {formatDuration(entry.answerSeconds)}
      </Badge>
      {showSource && entry.source ? (
        <Badge tone="neutral" size={size} variant="outline">
          Source bank · {entry.source}
        </Badge>
      ) : null}
    </span>
  );
}
