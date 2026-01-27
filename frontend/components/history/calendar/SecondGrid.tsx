'use client';

import BaseGrid from './BaseGrid';
import { CalendarNode } from '../CalendarDrillDown';

interface SecondGridProps {
    nodes: CalendarNode[];
    onNodeClick: (node: CalendarNode) => void;
}

export default function SecondGrid({ nodes, onNodeClick }: SecondGridProps) {
    return <BaseGrid nodes={nodes} onNodeClick={onNodeClick} />;
}
