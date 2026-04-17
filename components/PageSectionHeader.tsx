"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type PageSectionHeaderProps = {
  icon: IconDefinition;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export default function PageSectionHeader({
  icon,
  title,
  subtitle,
  right
}: PageSectionHeaderProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={icon} className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-[2rem] font-semibold leading-none text-text">{title}</h2>
        </div>
        {right}
      </div>
      {subtitle ? <p className="mt-0 text-sm leading-tight text-muted">{subtitle}</p> : null}
    </div>
  );
}
