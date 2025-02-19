import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface GradeFormProps {
  classId: string;
  onClose: () => void;
}

interface GradeFormData {
  name: string;
  type: 'test' | 'quiz' | 'homework' | 'participation' | 'project';
  score: number;
  maxScore: number;
  date: string;
  feedback?: string;
}

export function GradeForm({ classId, onClose }: GradeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<GradeFormData>();

  const queryClient = useQueryClient();

  const addGradeMutation = useMutation({
    mutationFn: async (data: GradeFormData) => {
      const { error } = await supabase
        .from('assignments')
        .insert([{
          class_id: classId,
          name: data.name,
          type: data.type,
          score: data.score,
          max_score: data.maxScore,
          date: data.date,
          feedback: data.feedback
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', classId] });
      reset();
      onClose();
    }
  });

  const onSubmit = (data: GradeFormData) => {
    addGradeMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Assignment Name
        </label>
        <input
          type="text"
          {...register('name', { required: 'Name is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          {...register('type', { required: 'Type is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="test">Test</option>
          <option value="quiz">Quiz</option>
          <option value="homework">Homework</option>
          <option value="participation">Participation</option>
          <option value="project">Project</option>
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Score
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('score', {
              required: 'Score is required',
              min: { value: 0, message: 'Score must be positive' }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.score && (
            <p className="mt-1 text-sm text-red-600">{errors.score.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Score
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('maxScore', {
              required: 'Max score is required',
              min: { value: 0, message: 'Max score must be positive' }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.maxScore && (
            <p className="mt-1 text-sm text-red-600">{errors.maxScore.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          type="date"
          {...register('date', { required: 'Date is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Feedback (Optional)
        </label>
        <textarea
          {...register('feedback')}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          disabled={addGradeMutation.isPending}
        >
          {addGradeMutation.isPending ? 'Adding...' : 'Add Grade'}
        </button>
      </div>
    </form>
  );
}