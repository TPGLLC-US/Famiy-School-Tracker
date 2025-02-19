import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { getGradeColor } from '../../lib/utils';
import { GradeImport } from './GradeImport';
import { Upload } from 'lucide-react';

interface GradeListProps {
  classId: string;
}

interface Assignment {
  id: string;
  name: string;
  type: string;
  score: number;
  max_score: number;
  date: string;
  feedback?: string;
}

export function GradeList({ classId }: GradeListProps) {
  const [showImport, setShowImport] = useState(false);
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Assignment[];
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!assignments?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No grades recorded yet</p>
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Upload className="h-5 w-5 mr-2 text-gray-500" />
          Import Grades
        </button>

        {showImport && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <GradeImport onClose={() => setShowImport(false)} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.type]) {
      acc[assignment.type] = [];
    }
    acc[assignment.type].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Upload className="h-4 w-4 mr-1 text-gray-500" />
          Import
        </button>
      </div>

      {Object.entries(groupedAssignments).map(([type, typeAssignments]) => (
        <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 capitalize">{type}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {typeAssignments.map((assignment) => {
              const percentage = (assignment.score / assignment.max_score) * 100;
              return (
                <div key={assignment.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{assignment.name}</h4>
                      <p className="text-xs text-gray-500">
                        {format(new Date(assignment.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getGradeColor(percentage)}`}>
                        {assignment.score} / {assignment.max_score}
                      </p>
                      <p className="text-xs text-gray-500">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {assignment.feedback && (
                    <p className="mt-1 text-sm text-gray-600">
                      {assignment.feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showImport && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <GradeImport onClose={() => setShowImport(false)} />
          </div>
        </div>
      )}
    </div>
  );
}