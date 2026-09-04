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
      strength={0.5}
      theme="light"
      borderRadius={12}
    >
      <Button
        render={<Link href="/planner" />}
        size="lg"
        className="h-12 gap-2.5 rounded-xl px-5 text-base shadow-lg shadow-primary/15"
      >
        <Ruler className="size-4.5" aria-hidden="true" />
        Open Room Planner
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </BorderBeam>
  );
}
