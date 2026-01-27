'use client';

import BaseGrid from './BaseGrid';
import { CalendarNode } from '../CalendarDrillDown';

interface TimeGridProps {
    nodes: CalendarNode[];
    onNodeClick: (node: CalendarNode) => void;
}

export default function TimeGrid({ nodes, onNodeClick }: TimeGridProps) {
    return <BaseGrid nodes={nodes} onNodeClick={onNodeClick} />;
}
