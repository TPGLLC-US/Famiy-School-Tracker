import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen, TrendingUp, Award, Bell } from 'lucide-react';
import { getGradeColor } from '../../lib/utils';
import { SubjectCard } from './SubjectCard';
import { useQuery } from '@tanstack/react-query';
import { getStudentPerformance, getStudentGradeTrends } from '../../lib/api';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { AIToggle } from '../ai/AIToggle';
import { AIAssistant } from '../ai/AIAssistant';

export function GradeOverview() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentEmail = searchParams.get('student');
  const { user } = useAuthStore();
  const [showAI, setShowAI] = useState(false);

  const { data: performance, isLoading: performanceLoading, error: performanceError } = useQuery({
    queryKey: ['student-performance', studentEmail || user?.email],
    queryFn: () => getStudentPerformance(studentEmail || user?.email || ''),
    enabled: !!(studentEmail || user?.email)
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['grade-trends', studentEmail || user?.email],
    queryFn: () => getStudentGradeTrends(studentEmail || user?.email || ''),
    enabled: !!(studentEmail || user?.email)
  });

  if (performanceLoading || trendsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (performanceError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading grades: {performanceError.message}</p>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No classes found</p>
      </div>
    );
  }

  // Calculate GPA only from classes that have grades
  const classesWithGrades = performance.filter(subject => subject.current_grade > 0);
  const overallGPA = classesWithGrades.length > 0
    ? classesWithGrades.reduce((acc, curr) => acc + curr.current_grade, 0) / classesWithGrades.length
    : 0;

  // Transform the data for Recharts
  const chartData = trends?.map(grade => ({
    date: new Date(grade.created_at).toLocaleDateString(),
    grade: (grade.score / grade.max_score) * 100,
    subject: grade.classes.subject
  })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall GPA</p>
              {classesWithGrades.length > 0 ? (
                <p className={`text-2xl font-bold ${getGradeColor(overallGPA)}`}>
                  {overallGPA.toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Add grades to see your GPA</p>
              )}
            </div>
            <Award className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{performance.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-yellow-600">
                {performance.filter(subject => subject.current_grade > 0 && subject.current_grade < 70).length}
              </p>
            </div>
            <Bell className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {performance.map((subject) => (
          <SubjectCard
            key={`${subject.id}-${subject.subject}`}
            subject={{
              id: subject.id,
              name: subject.subject,
              teacher_name: subject.teacher,
              currentGrade: subject.current_grade,
              trend: 0,
            }}
          />
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="grade" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  dot={{ fill: '#4f46e5' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!showAI && <AIToggle onClick={() => setShowAI(true)} />}
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
    </div>
  );
}