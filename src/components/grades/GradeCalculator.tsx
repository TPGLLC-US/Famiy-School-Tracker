import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getGradeColor } from '../../lib/utils';

interface GradeCalculatorProps {
  classId: string;
  weights: {
    tests_percentage: number;
    quizzes_percentage: number;
    homework_percentage: number;
    participation_percentage: number;
    projects_percentage: number;
  };
}

interface Assignment {
  type: string;
  score: number;
  max_score: number;
}

export function GradeCalculator({ classId, weights }: GradeCalculatorProps) {
  const { data: assignments } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classId);

      if (error) throw error;
      return data as Assignment[];
    }
  });

  const calculateTypeAverage = (type: string) => {
    const typeAssignments = assignments?.filter(a => a.type === type) || [];
    if (typeAssignments.length === 0) return null;

    const total = typeAssignments.reduce((sum, assignment) => {
      return sum + (assignment.score / assignment.max_score);
    }, 0);

    return (total / typeAssignments.length) * 100;
  };

  const calculateWeightedGrade = () => {
    const types = {
      test: calculateTypeAverage('test'),
      quiz: calculateTypeAverage('quiz'),
      homework: calculateTypeAverage('homework'),
      participation: calculateTypeAverage('participation'),
      project: calculateTypeAverage('project')
    };

    let totalWeight = 0;
    let weightedSum = 0;

    if (types.test !== null) {
      weightedSum += types.test * (weights.tests_percentage / 100);
      totalWeight += weights.tests_percentage;
    }
    if (types.quiz !== null) {
      weightedSum += types.quiz * (weights.quizzes_percentage / 100);
      totalWeight += weights.quizzes_percentage;
    }
    if (types.homework !== null) {
      weightedSum += types.homework * (weights.homework_percentage / 100);
      totalWeight += weights.homework_percentage;
    }
    if (types.participation !== null) {
      weightedSum += types.participation * (weights.participation_percentage / 100);
      totalWeight += weights.participation_percentage;
    }
    if (types.project !== null) {
      weightedSum += types.project * (weights.projects_percentage / 100);
      totalWeight += weights.projects_percentage;
    }

    return totalWeight > 0 ? weightedSum * (100 / totalWeight) : null;
  };

  const weightedGrade = calculateWeightedGrade();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Grade Summary</h3>
      
      <div className="space-y-2">
        {['test', 'quiz', 'homework', 'participation', 'project'].map(type => {
          const average = calculateTypeAverage(type);
          const weight = weights[`${type}s_percentage` as keyof typeof weights];
          
          if (weight === 0) return null;
          
          return (
            <div key={type} className="flex justify-between items-center text-sm">
              <span className="capitalize text-gray-600">{type}s ({weight}%)</span>
              {average !== null ? (
                <span className={getGradeColor(average)}>
                  {average.toFixed(1)}%
                </span>
              ) : (
                <span className="text-gray-400">No grades</span>
              )}
            </div>
          );
        })}

        {weightedGrade !== null && (
          <div className="pt-2 mt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Current Grade</span>
              <span className={`font-medium ${getGradeColor(weightedGrade)}`}>
                {weightedGrade.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}