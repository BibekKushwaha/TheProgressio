import { Card, CardContent } from "@/components/ui/card";

export const StatCard = ({ icon: Icon, value, label, sublabel, colorClass }: {
    icon: React.ElementType,
    value: string | number,
    label: string,
    sublabel: string,
    colorClass: string
}) => (
    <Card variant="glass" className="text-center p-5">
        <CardContent className="p-0">
            <Icon className={`w - 8 h - 8 ${colorClass} mx - auto mb - 2`} />
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
            <div className="text-xs text-slate-500">{sublabel}</div>
        </CardContent>
    </Card>
);
