
import React from 'react';

interface ProgressBarProps {
  value: number;
  message: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, message }) => {
  return (
    <div className="mt-6">
        <p className="text-center text-sm text-gray-600 mb-2">{message}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
            className="bg-[#0D47A1] h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${value}%` }}
            ></div>
        </div>
    </div>
  );
};
