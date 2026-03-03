/**
 * Consolidated recharts re-export barrel.
 *
 * All analytics chart components import from this file instead of 'recharts'
 * directly. Because all dynamic chunks share a single import path, the bundler
 * (Turbopack / webpack) can extract recharts into a single shared async chunk
 * rather than duplicating it across each lazy boundary.
 *
 * Usage in chart components:
 *   import { BarChart, Bar, ResponsiveContainer } from '@/lib/recharts';
 */
export {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
    ReferenceLine,
    type TooltipProps,
} from 'recharts';
