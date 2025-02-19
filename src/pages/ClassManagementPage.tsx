import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GradeForm } from '../components/grades/GradeForm';
import { GradeList } from '../components/grades/GradeList';
import { GradeCalculator } from '../components/grades/GradeCalculator';
import { ClassImport } from '../components/classes/ClassImport';
import { useLocation } from 'react-router-dom';

interface ClassFormData {
  subject: string;
  teacher: string;
  email: string;
  room_number: string;
  extra_help_day: string;
  extra_help_time: string;
  tests_percentage: number;
  quizzes_percentage: number;
  homework_percentage: number;
  participation_percentage: number;
  projects_percentage: number;
}

export function ClassManagementPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedClassForGrades, setSelectedClassForGrades] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentEmail = searchParams.get('student');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes', studentEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('student', studentEmail || user?.email);
      
      if (error) throw error;
      return data;
    },
    enabled: !!(studentEmail || user?.email),
  });

  const addClassMutation = useMutation({
    mutationFn: async (newClass: ClassFormData) => {
      const { data, error } = await supabase
        .from('classes')
        .insert([{
          ...newClass,
          student: studentEmail || user?.email,
          tests_percentage: Number(newClass.tests_percentage),
          quizzes_percentage: Number(newClass.quizzes_percentage),
          homework_percentage: Number(newClass.homework_percentage),
          participation_percentage: Number(newClass.participation_percentage),
          projects_percentage: Number(newClass.projects_percentage),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsEditing(false);
      setSelectedClass(null);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, ...updates }: ClassFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('classes')
        .update({
          ...updates,
          student: studentEmail || user?.email,
          tests_percentage: Number(updates.tests_percentage),
          quizzes_percentage: Number(updates.quizzes_percentage),
          homework_percentage: Number(updates.homework_percentage),
          participation_percentage: Number(updates.participation_percentage),
          projects_percentage: Number(updates.projects_percentage),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsEditing(false);
      setSelectedClass(null);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const initialFormData: ClassFormData = {
    subject: '',
    teacher: '',
    email: '',
    room_number: '',
    extra_help_day: '',
    extra_help_time: '',
    tests_percentage: 40,
    quizzes_percentage: 20,
    homework_percentage: 20,
    participation_percentage: 10,
    projects_percentage: 10,
  };

  const [formData, setFormData] = useState<ClassFormData>(initialFormData);

  const calculateTotal = (data: ClassFormData) => {
    return (
      Number(data.tests_percentage) +
      Number(data.quizzes_percentage) +
      Number(data.homework_percentage) +
      Number(data.participation_percentage) +
      Number(data.projects_percentage)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalPercentage = calculateTotal(formData);

    if (totalPercentage !== 100) {
      setError('Grade weights must total 100%');
      return;
    }

    try {
      if (selectedClass) {
        await updateClassMutation.mutateAsync({ ...formData, id: selectedClass.id });
      } else {
        await addClassMutation.mutateAsync(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (classData: any) => {
    setSelectedClass(classData);
    setFormData({
      subject: classData.subject || '',
      teacher: classData.teacher || '',
      email: classData.email || '',
      room_number: classData.room_number || '',
      extra_help_day: classData.extra_help_day || '',
      extra_help_time: classData.extra_help_time || '',
      tests_percentage: Number(classData.tests_percentage) || 40,
      quizzes_percentage: Number(classData.quizzes_percentage) || 20,
      homework_percentage: Number(classData.homework_percentage) || 20,
      participation_percentage: Number(classData.participation_percentage) || 10,
      projects_percentage: Number(classData.projects_percentage) || 10,
    });
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Upload className="h-5 w-5 mr-2" />
            Import Classes
          </button>
          {!isEditing && (
            <button
              onClick={() => {
                setIsEditing(true);
                setSelectedClass(null);
                setFormData(initialFormData);
              }}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Class
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Teacher</label>
                <input
                  type="text"
                  required
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Room Number</label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Extra Help Day</label>
                <select
                  value={formData.extra_help_day}
                  onChange={(e) => setFormData({ ...formData, extra_help_day: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Extra Help Time</label>
                <input
                  type="time"
                  value={formData.extra_help_time}
                  onChange={(e) => setFormData({ ...formData, extra_help_time: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Grade Weights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tests (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.tests_percentage}
                    onChange={(e) => setFormData({ ...formData, tests_percentage: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quizzes (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.quizzes_percentage}
                    onChange={(e) => setFormData({ ...formData, quizzes_percentage: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Homework (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.homework_percentage}
                    onChange={(e) => setFormData({ ...formData, homework_percentage: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Participation (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.participation_percentage}
                    onChange={(e) => setFormData({ ...formData, participation_percentage: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Projects (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.projects_percentage}
                    onChange={(e) => setFormData({ ...formData, projects_percentage: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total (%)</label>
                  <div className={`mt-1 px-3 py-2 rounded-md border ${
                    calculateTotal(formData) !== 100 
                      ? 'border-red-300 bg-red-50 text-red-700' 
                      : 'border-green-300 bg-green-50 text-green-700'
                  }`}>
                    <span className="font-medium">{calculateTotal(formData)}%</span>
                    {calculateTotal(formData) !== 100 && (
                      <p className="text-xs text-red-600 mt-1">
                        Total must equal 100%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedClass(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                disabled={calculateTotal(formData) !== 100}
              >
                {selectedClass ? 'Update' : 'Add'} Class
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {classes?.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{classItem.subject}</h3>
                    <p className="text-gray-600">{classItem.teacher}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(classItem)}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Class Details</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>Room: {classItem.room_number}</p>
                      <p>Extra Help: {classItem.extra_help_day} {classItem.extra_help_time}</p>
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">Grade Weights</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>Tests: {classItem.tests_percentage}%</p>
                      <p>Quizzes: {classItem.quizzes_percentage}%</p>
                      <p>Homework: {classItem.homework_percentage}%</p>
                      <p>Participation: {classItem.participation_percentage}%</p>
                      <p>Projects: {classItem.projects_percentage}%</p>
                    </div>
                  </div>
                  
                  <div>
                    <GradeCalculator
                      classId={classItem.id}
                      weights={{
                        tests_percentage: Number(classItem.tests_percentage),
                        quizzes_percentage: Number(classItem.quizzes_percentage),
                        homework_percentage: Number(classItem.homework_percentage),
                        participation_percentage: Number(classItem.participation_percentage),
                        projects_percentage: Number(classItem.projects_percentage),
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium text-gray-700">Recent Grades</h4>
                      <button
                        onClick={() => setSelectedClassForGrades(classItem.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        Add Grade
                      </button>
                    </div>
                    <GradeList classId={classItem.id} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grade Form Modal */}
      {selectedClassForGrades && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Grade</h2>
            <GradeForm
              classId={selectedClassForGrades}
              onClose={() => setSelectedClassForGrades(null)}
            />
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <ClassImport onClose={() => setShowImport(false)} />
          </div>
        </div>
      )}
    </div>
  );
}