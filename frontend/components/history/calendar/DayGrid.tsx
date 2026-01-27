'use client';

import BaseGrid from './BaseGrid';
import { CalendarNode } from '../CalendarDrillDown';

interface DayGridProps {
    nodes: CalendarNode[];
    onNodeClick: (node: CalendarNode) => void;
}

export default function DayGrid({ nodes, onNodeClick }: DayGridProps) {
    return <BaseGrid nodes={nodes} onNodeClick={onNodeClick} />;
}
