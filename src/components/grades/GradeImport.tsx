import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Upload, AlertCircle } from 'lucide-react';

interface CSVGrade {
  Student: string;
  Course: string;
  Category: string;
  'Assignment Name / Description': string;
  Date: string;
  Max: string;
  Score: string;
  Percentage: string;
  Subject: string;
  Teacher: string;
}

interface GradeImportProps {
  onClose: () => void;
}

export function GradeImport({ onClose }: GradeImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const importGradesMutation = useMutation({
    mutationFn: async (grades: CSVGrade[]) => {
      setImporting(true);
      try {
        // First, get or create the class for each grade
        for (const grade of grades) {
          // Get the class ID or create if it doesn't exist
          const { data: existingClass, error: classQueryError } = await supabase
            .from('classes')
            .select('id')
            .eq('student', grade.Student)
            .eq('subject', grade.Subject)
            .eq('teacher', grade.Teacher)
            .single();

          if (classQueryError && classQueryError.code !== 'PGRST116') {
            throw classQueryError;
          }

          let classId;
          if (!existingClass) {
            const { data: newClass, error: createClassError } = await supabase
              .from('classes')
              .insert([{
                student: grade.Student,
                subject: grade.Subject,
                teacher: grade.Teacher,
                email: '', // You might want to add these fields to your CSV
                tests_percentage: 0,
                quizzes_percentage: 0,
                homework_percentage: 0,
                participation_percentage: 0,
                projects_percentage: 0
              }])
              .select()
              .single();

            if (createClassError) throw createClassError;
            classId = newClass.id;
          } else {
            classId = existingClass.id;
          }

          // Map the category to assignment type
          const typeMap: { [key: string]: string } = {
            'Test': 'test',
            'Quiz': 'quiz',
            'HW/Class Participation': 'homework',
            'Homework': 'homework',
            'Participation': 'participation',
            'Project': 'project'
          };

          // Create the assignment
          const { error: createAssignmentError } = await supabase
            .from('assignments')
            .insert([{
              class_id: classId,
              name: grade['Assignment Name / Description'],
              type: typeMap[grade.Category] || 'homework',
              score: parseFloat(grade.Score),
              max_score: parseFloat(grade.Max),
              date: new Date(grade.Date).toISOString().split('T')[0],
            }]);

          if (createAssignmentError) throw createAssignmentError;
        }
      } finally {
        setImporting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      onClose();
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());
        
        const grades: CSVGrade[] = rows.slice(1)
          .filter(row => row.trim()) // Skip empty rows
          .map(row => {
            const values = row.split(',').map(v => v.trim());
            return headers.reduce((obj: any, header, index) => {
              obj[header] = values[index];
              return obj;
            }, {});
          });

        await importGradesMutation.mutateAsync(grades);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Import Grades from CSV</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500"
              >
                <span>Upload a CSV file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileUpload}
                  disabled={importing}
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">CSV file with headers</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Expected CSV Format:</h3>
          <p className="text-xs text-gray-600">
            Student,Course,Category,Assignment Name / Description,Date,Max,Score,Percentage,Subject,Teacher
          </p>
        </div>

        {importing && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-sm text-gray-600">Importing grades...</span>
          </div>
        )}
      </div>
    </div>
  );
}