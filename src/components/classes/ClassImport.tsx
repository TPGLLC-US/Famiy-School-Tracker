import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Upload, AlertCircle } from 'lucide-react';

interface CSVClass {
  Student: string;
  Subject: string;
  Teacher: string;
  Image: string;
  Email: string;
  Phone: string;
  'Extra Help Day': string;
  'Extra Help Time': string;
  'Room Number': string;
  Tests: string;
  Quizzes: string;
  Homework: string;
  Participation: string;
  Projects: string;
  Notes: string;
}

interface ClassImportProps {
  onClose: () => void;
}

export function ClassImport({ onClose }: ClassImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const parsePercentage = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove % sign and convert to number
    const num = Number(value.replace('%', '').trim());
    return isNaN(num) ? 0 : num;
  };

  const validatePercentages = (classData: CSVClass): boolean => {
    const total = parsePercentage(classData.Tests) +
                 parsePercentage(classData.Quizzes) +
                 parsePercentage(classData.Homework) +
                 parsePercentage(classData.Participation) +
                 parsePercentage(classData.Projects);
    
    return total <= 100;
  };

  const importClassesMutation = useMutation({
    mutationFn: async (classes: CSVClass[]) => {
      setImporting(true);
      try {
        // Validate all classes first
        for (const classData of classes) {
          if (!validatePercentages(classData)) {
            throw new Error(`Grade weights for ${classData.Subject} exceed 100%`);
          }
        }

        // Process each class
        for (const classData of classes) {
          const { error: createClassError } = await supabase
            .from('classes')
            .insert([{
              student: classData.Student.trim(),
              subject: classData.Subject.trim(),
              teacher: classData.Teacher.trim(),
              email: classData.Email.trim(),
              room_number: classData['Room Number']?.trim() || '',
              extra_help_day: classData['Extra Help Day']?.trim() || '',
              extra_help_time: classData['Extra Help Time']?.trim() || '',
              tests_percentage: parsePercentage(classData.Tests),
              quizzes_percentage: parsePercentage(classData.Quizzes),
              homework_percentage: parsePercentage(classData.Homework),
              participation_percentage: parsePercentage(classData.Participation),
              projects_percentage: parsePercentage(classData.Projects)
            }]);

          if (createClassError) {
            throw new Error(`Failed to import ${classData.Subject}: ${createClassError.message}`);
          }
        }
      } finally {
        setImporting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const parseCSV = (text: string): CSVClass[] => {
    const rows = text.split(/\r?\n/); // Handle both CRLF and LF
    const headers = rows[0].split(',').map(h => h.trim());
    
    return rows.slice(1)
      .filter(row => row.trim()) // Skip empty rows
      .map(row => {
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());

        // Create object from headers and values
        return headers.reduce((obj: any, header, index) => {
          obj[header] = values[index]?.replace(/^"|"$/g, '') || ''; // Remove quotes if present
          return obj;
        }, {} as CSVClass);
      });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const classes = parseCSV(text);

        if (classes.length === 0) {
          throw new Error('No valid data found in CSV file');
        }

        // Validate required fields
        for (const classData of classes) {
          if (!classData.Student || !classData.Subject || !classData.Teacher) {
            throw new Error('Missing required fields (Student, Subject, or Teacher)');
          }
        }

        await importClassesMutation.mutateAsync(classes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Import Classes from CSV</h2>
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
          <h3 className="text-sm font-medium text-gray-900 mb-2">Required CSV Format:</h3>
          <div className="text-xs text-gray-600 space-y-2">
            <p className="font-medium">Headers:</p>
            <p className="whitespace-pre-wrap">
              Student,Subject,Teacher,Image,Email,Phone,Extra Help Day,Extra Help Time,Room Number,Tests,Quizzes,Homework,Participation,Projects,Notes
            </p>
            <p className="font-medium mt-2">Example:</p>
            <p className="whitespace-pre-wrap">
              student@email.com,Math,John Smith,,smith@school.edu,,Monday,3:00 PM,101,40%,20%,20%,10%,10%,
            </p>
            <div className="mt-2">
              <p className="font-medium">Notes:</p>
              <ul className="list-disc list-inside">
                <li>Student, Subject, and Teacher are required</li>
                <li>Percentages should add up to 100% or less</li>
                <li>Empty fields are allowed</li>
              </ul>
            </div>
          </div>
        </div>

        {importing && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-sm text-gray-600">Importing classes...</span>
          </div>
        )}
      </div>
    </div>
  );
}