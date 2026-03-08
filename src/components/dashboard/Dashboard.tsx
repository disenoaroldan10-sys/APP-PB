import React from 'react';
import { motion } from 'motion/react';
import { MonthSelector } from './MonthSelector';
import { SelectedMonthsList } from './SelectedMonthsList';
import { PriceChart } from './PriceChart';
import { SummaryStats } from './SummaryStats';

interface DashboardProps {
  currentYear: number;
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>;
  showYearMatrix: boolean;
  setShowYearMatrix: React.Dispatch<React.SetStateAction<boolean>>;
  monthsList: string[];
  selectedMonths: any[];
  setSelectedMonths: React.Dispatch<React.SetStateAction<any[]>>;
  handleAddMonth: (year: number, month: number) => void;
  handleRemoveMonth: (id: string) => void;
  isMounted: boolean;
  chartData: any[];
  colors: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentYear,
  setCurrentYear,
  showYearMatrix,
  setShowYearMatrix,
  monthsList,
  selectedMonths,
  setSelectedMonths,
  handleAddMonth,
  handleRemoveMonth,
  isMounted,
  chartData,
  colors
}) => {
  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      {/* Left Sidebar: Controls */}
      <div className="lg:col-span-4 space-y-6">
        <MonthSelector 
          currentYear={currentYear}
          setCurrentYear={setCurrentYear}
          showYearMatrix={showYearMatrix}
          setShowYearMatrix={setShowYearMatrix}
          monthsList={monthsList}
          selectedMonths={selectedMonths}
          handleAddMonth={handleAddMonth}
        />

        <SelectedMonthsList 
          selectedMonths={selectedMonths}
          setSelectedMonths={setSelectedMonths}
          handleRemoveMonth={handleRemoveMonth}
          colors={colors}
        />
      </div>

      {/* Right Content: Visualization */}
      <div className="lg:col-span-8 space-y-6">
        <PriceChart 
          isMounted={isMounted}
          selectedMonths={selectedMonths}
          chartData={chartData}
          colors={colors}
        />

        <SummaryStats 
          selectedMonths={selectedMonths}
        />
      </div>
    </motion.div>
  );
};
