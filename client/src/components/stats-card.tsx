import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

export default function StatsCard({ title, value, icon: Icon, bgColor, iconColor }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid={`card-stat-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 ${bgColor} rounded-md flex items-center justify-center`}>
            <Icon className={iconColor} size={16} />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-semibold text-gray-900" data-testid={`text-stat-value-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
              {value}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
