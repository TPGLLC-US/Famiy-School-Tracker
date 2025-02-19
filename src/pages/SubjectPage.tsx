import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getGradeColor } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  BookOpen, Mail, Clock, MapPin, Calendar, ArrowLeft, Download, ExternalLink,
  ArrowUpDown, Search, Filter, X
} from 'lucide-react';
import { AIToggle } from '../components/ai/AIToggle';
import { AIAssistant } from '../components/ai/AIAssistant';

interface Assignment {
  id: string;
  name: string;
  type: string;
  score: number;
  max_score: number;
  created_at: string;
  feedback?: string;
}

interface SortConfig {
  key: keyof Assignment;
  direction: 'asc' | 'desc';
}

export function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<'all' | 'above90' | 'below70'>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [showAI, setShowAI] = useState(false);

  const { data: subject, isLoading: subjectLoading, error: subjectError } = useQuery({
    queryKey: ['subject', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const filteredAndSortedAssignments = useMemo(() => {
    if (!assignments) return [];

    let filtered = [...assignments];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(assignment => 
        assignment.name.toLowerCase().includes(search.toLowerCase()) ||
        assignment.type.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter.length > 0) {
      filtered = filtered.filter(assignment => typeFilter.includes(assignment.type));
    }

    // Apply grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(assignment => {
        const percentage = (assignment.score / assignment.max_score) * 100;
        if (gradeFilter === 'above90') return percentage >= 90;
        if (gradeFilter === 'below70') return percentage < 70;
        return true;
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc' 
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [assignments, search, typeFilter, gradeFilter, sortConfig]);

  const uniqueTypes = useMemo(() => {
    if (!assignments) return [];
    return Array.from(new Set(assignments.map(a => a.type)));
  }, [assignments]);

  if (subjectLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (subjectError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading subject: {subjectError.message}</p>
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Subject not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate current grade
  const calculateGrade = () => {
    if (!assignments?.length) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    assignments.forEach((assignment) => {
      const weight = subject[`${assignment.type}s_percentage`] / 100;
      if (weight) {
        totalWeight += weight;
        weightedSum += (assignment.score / assignment.max_score) * weight;
      }
    });

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  };

  const currentGrade = calculateGrade();

  // Transform assignments data for the chart
  const chartData = assignments?.map(assignment => ({
    date: new Date(assignment.created_at).toLocaleDateString(),
    grade: (assignment.score / assignment.max_score) * 100,
    type: assignment.type
  })) || [];

  const handleSort = (key: keyof Assignment) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-600 hover:text-indigo-600 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subject.subject}</h1>
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-gray-600">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>{subject.teacher}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Mail className="h-5 w-5 mr-2" />
                <a href={`mailto:${subject.email}`} className="hover:text-indigo-600">
                  {subject.email}
                </a>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2" />
                <span>Room {subject.room_number}</span>
              </div>
              {subject.extra_help_day && (
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>Extra Help: {subject.extra_help_day} at {subject.extra_help_time}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 md:mt-0 text-right">
            <p className="text-sm font-medium text-gray-600">Current Grade</p>
            <p className={`text-3xl font-bold ${getGradeColor(currentGrade)}`}>
              {currentGrade.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade History</h2>
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

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Assignments</h2>
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assignments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="relative">
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value as typeof gradeFilter)}
                    className="pl-4 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Grades</option>
                    <option value="above90">Above 90%</option>
                    <option value="below70">Below 70%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {uniqueTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(current => 
                    current.includes(type)
                      ? current.filter(t => t !== type)
                      : [...current, type]
                  )}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    typeFilter.includes(type)
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
              {typeFilter.length > 0 && (
                <button
                  onClick={() => setTypeFilter([])}
                  className="px-3 py-1 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 flex items-center"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Assignment</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('type')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Type</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('score')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Score</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Date</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedAssignments.map((assignment) => {
                    const percentage = (assignment.score / assignment.max_score) * 100;
                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{assignment.name}</div>
                          {assignment.feedback && (
                            <div className="text-sm text-gray-500 mt-1">{assignment.feedback}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {assignment.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getGradeColor(percentage)}`}>
                            {assignment.score} / {assignment.max_score}
                          </div>
                          <div className="text-sm text-gray-500">
                            {percentage.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAndSortedAssignments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No assignments found matching your filters
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Weights</h2>
            <div className="space-y-3">
              {[
                ['Tests', subject.tests_percentage],
                ['Quizzes', subject.quizzes_percentage],
                ['Homework', subject.homework_percentage],
                ['Participation', subject.participation_percentage],
                ['Projects', subject.projects_percentage]
              ].map(([type, percentage]) => (
                percentage > 0 && (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-gray-600">{type}</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                )
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Extra Help Resources</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Office Hours</span>
                <span className="text-gray-900">{subject.extra_help_day} {subject.extra_help_time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Room</span>
                <span className="text-gray-900">{subject.room_number}</span>
              </div>
              <a
                href={`mailto:${subject.email}?subject=Help Request: ${subject.subject}`}
                className="flex items-center text-indigo-600 hover:text-indigo-500"
              >
                <Mail className="h-4 w-4 mr-2" />
                Request Help
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Important Links</h2>
            <div className="space-y-3">
              <a
                href="#"
                className="flex items-center text-indigo-600 hover:text-indigo-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Course Syllabus
              </a>
              <a
                href="#"
                className="flex items-center text-indigo-600 hover:text-indigo-500"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Online Resources
              </a>
              <a
                href="#"
                className="flex items-center text-indigo-600 hover:text-indigo-500"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Class Calendar
              </a>
            </div>
          </div>
        </div>
      </div>
      {!showAI && <AIToggle onClick={() => setShowAI(true)} />}
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
    </div>
  );
}