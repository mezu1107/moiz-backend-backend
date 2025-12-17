// src/components/StatsBar.tsx

import { KitchenStats } from '../types/types';
import { Package, Clock, CheckCircle, Archive } from 'lucide-react';

interface Props {
  stats: KitchenStats;
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="bg-gradient-to-b from-gray-900 to-black text-white py-12 px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto">

        {/* New Orders */}
        <div className="bg-orange-600 rounded-3xl p-8 md:p-10 text-center shadow-2xl">
          <Package className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-6" />
          <div className="text-3xl md:text-4xl font-bold">New</div>
          <div className="text-7xl md:text-8xl font-black mt-6">{stats.new}</div>
        </div>

        {/* Preparing */}
        <div className="bg-blue-600 rounded-3xl p-8 md:p-10 text-center shadow-2xl">
          <Clock className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-6" />
          <div className="text-3xl md:text-4xl font-bold">Preparing</div>
          <div className="text-7xl md:text-8xl font-black mt-6">{stats.preparing}</div>
        </div>

        {/* Ready Today */}
        <div className="bg-green-600 rounded-3xl p-8 md:p-10 text-center shadow-2xl">
          <CheckCircle className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-6" />
          <div className="text-3xl md:text-4xl font-bold">Ready</div>
          <div className="text-7xl md:text-8xl font-black mt-6">{stats.readyToday}</div>
        </div>

        {/* Completed Today */}
        <div className="bg-purple-600 rounded-3xl p-8 md:p-10 text-center shadow-2xl">
          <Archive className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-6" />
          <div className="text-3xl md:text-4xl font-bold">Completed</div>
          <div className="text-7xl md:text-8xl font-black mt-6">{stats.completedToday}</div>
        </div>

      </div>
    </div>
  );
}