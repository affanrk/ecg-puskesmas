'use client';

import BaseGrid from './BaseGrid';
import { CalendarNode } from '../CalendarDrillDown';

interface MonthGridProps {
    nodes: CalendarNode[];
    onNodeClick: (node: CalendarNode) => void;
}

export default function MonthGrid({ nodes, onNodeClick }: MonthGridProps) {
    return <BaseGrid nodes={nodes} onNodeClick={onNodeClick} />;
}
