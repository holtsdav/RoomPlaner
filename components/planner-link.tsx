'use client';

import { BorderBeam } from 'border-beam';
import { ArrowRight, Ruler } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PlannerLink() {
  return (
    <BorderBeam
      size="pulse-outside"
      colorVariant="ocean"
      strength={0.85}
      brightness={1.55}
      saturation={1.35}
      theme="light"
      borderRadius={14}
    >
      <Button
        render={<Link href="/planner" />}
        size="lg"
        className="h-14 gap-3 rounded-[14px] border-2 border-cyan-300/80 px-7 text-base shadow-xl shadow-primary/20 hover:border-cyan-200"
      >
        <Ruler className="size-4.5" aria-hidden="true" />
        Open Room Planner
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </BorderBeam>
  );
}
