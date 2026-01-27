'use client';

import BaseGrid from './BaseGrid';
import { CalendarNode } from '../CalendarDrillDown';

interface YearGridProps {
    nodes: CalendarNode[];
    onNodeClick: (node: CalendarNode) => void;
}

export default function YearGrid({ nodes, onNodeClick }: YearGridProps) {
    return <BaseGrid nodes={nodes} onNodeClick={onNodeClick} centered={true} />;
}
