import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { getGradeColor } from '../../lib/utils';

interface SubjectCardProps {
  subject: {
    id: string;
    name: string;
    teacher_name: string;
    currentGrade: number;
    trend: number;
  };
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const TrendIcon = subject.trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = subject.trend >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <Link
      to={`/subjects/${subject.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
              <p className="text-sm text-gray-500">{subject.teacher_name}</p>
            </div>
          </div>
          <div className="text-right">
            {subject.currentGrade === 0 ? (
              <p className="text-sm text-gray-500">Add grades to see your average</p>
            ) : (
              <p className={`text-2xl font-bold ${getGradeColor(subject.currentGrade)}`}>
                {subject.currentGrade.toFixed(1)}%
              </p>
            )}
            {subject.trend !== 0 && (
              <div className="flex items-center justify-end mt-1">
                <TrendIcon className={`h-4 w-4 ${trendColor} mr-1`} />
                <span className={`text-sm ${trendColor}`}>
                  {Math.abs(subject.trend)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}