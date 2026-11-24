import React from 'react';

const createIcon = (name: string) => {
  const Comp = (props: any) => React.createElement('View', { 'data-icon': name, ...props });
  Comp.displayName = name;
  return Comp;
};

export const Check = createIcon('Check');
export const Trophy = createIcon('Trophy');
export const Award = createIcon('Award');
export const Flame = createIcon('Flame');
export const Sparkles = createIcon('Sparkles');
export const Settings = createIcon('Settings');
export const Footprints = createIcon('Footprints');
export const Zap = createIcon('Zap');
export const Radio = createIcon('Radio');
export const ChevronLeft = createIcon('ChevronLeft');
export const Timer = createIcon('Timer');
export const X = createIcon('X');
export const BellRing = createIcon('BellRing');
export const Plus = createIcon('Plus');

const iconsProxy = new Proxy({
  Check,
  Trophy,
  Award,
  Flame,
  Sparkles,
  Settings,
  Footprints,
  Zap,
  Radio,
  ChevronLeft,
  Timer,
  X,
  BellRing,
  Plus,
}, {
  get: (target: any, prop: string) => {
    if (prop in target) return target[prop];
    return createIcon(prop);
  },
});

export default iconsProxy;
