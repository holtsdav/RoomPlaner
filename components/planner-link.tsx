'use client';

import { BorderBeam } from 'border-beam';
import { ArrowRight, Ruler } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PlannerLink() {
  return (
    <BorderBeam
      size="pulse-outside"
      colorVariant="mono"
      strength={0.7}
      brightness={1.35}
      saturation={1}
      theme="dark"
      borderRadius={14}
    >
      <Button
        render={<Link href="/planner" />}
        size="lg"
        className="h-14 gap-3 rounded-[14px] border-2 border-white/45 px-7 text-base shadow-xl shadow-primary/20 hover:border-white/70"
      >
        <Ruler className="size-4.5" aria-hidden="true" />
        Open Room Planner
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </BorderBeam>
  );
}
