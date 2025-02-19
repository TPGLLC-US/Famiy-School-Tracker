import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Award, Star, Plus, TrendingUp, BookOpen, ExternalLink, Clock, Search, Filter, ArrowUpDown } from 'lucide-react';
import { 
  getLinkedStudents, 
  awardPoints, 
  linkStudentToParent, 
  getStudentPerformance, 
  getStudentGradeTrends,
  getRedemptionHistory,
  updateRewardRedemptionStatus
} from '../lib/api';
import { getGradeColor } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { AIToggle } from '../components/ai/AIToggle';
import { AIAssistant } from '../components/ai/AIAssistant';

export function ParentDashboard() {
  const [showLinkForm, setShowLinkForm] = React.useState(false);
  const [studentEmail, setStudentEmail] = React.useState('');
  const [selectedStudent, setSelectedStudent] = React.useState<string | null>(null);
  const [pointsToAward, setPointsToAward] = React.useState('');
  const [pointReason, setPointReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [showAI, setShowAI] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'redemption_date', direction: 'desc' });
  
  const queryClient = useQueryClient();
  const pageSize = 10;

  const { data: students, isLoading } = useQuery({
    queryKey: ['linked-students'],
    queryFn: getLinkedStudents
  });

  const { data: performance } = useQuery({
    queryKey: ['student-performance', selectedStudent],
    queryFn: () => getStudentPerformance(selectedStudent!),
    enabled: !!selectedStudent
  });

  const { data: gradeTrends } = useQuery({
    queryKey: ['grade-trends', selectedStudent],
    queryFn: () => getStudentGradeTrends(selectedStudent!),
    enabled: !!selectedStudent
  });

  const { data: redemptionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['redemption-history', selectedStudent, currentPage],
    queryFn: () => getRedemptionHistory(currentPage, pageSize),
    enabled: !!selectedStudent
  });

  const linkStudentMutation = useMutation({
    mutationFn: linkStudentToParent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-students'] });
      setStudentEmail('');
      setShowLinkForm(false);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });

  const awardPointsMutation = useMutation({
    mutationFn: ({ email, points, reason }: { email: string; points: number; reason: string }) =>
      awardPoints(email, points, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-points'] });
      setPointsToAward('');
      setPointReason('');
      setSelectedStudent(null);
    }
  });

  const updateRedemptionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      updateRewardRedemptionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemption-history'] });
    }
  });

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail) return;

    try {
      await linkStudentMutation.mutateAsync(studentEmail);
    } catch (err) {
      // Error is handled by mutation onError
    }
  };

  const handleAwardPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !pointsToAward || !pointReason) return;

    awardPointsMutation.mutate({
      email: selectedStudent,
      points: parseInt(pointsToAward),
      reason: pointReason
    });
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const approvedStudents = students?.filter(s => s.status === 'approved') || [];
  const totalPages = Math.ceil((redemptionHistory?.total || 0) / pageSize);

  // Filter and sort history data
  const filteredAndSortedHistory = React.useMemo(() => {
    if (!redemptionHistory?.data) return [];

    let filtered = [...redemptionHistory.data];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.reward_name.toLowerCase().includes(searchLower) ||
        item.student_email.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    const { key, direction } = sortConfig;
    return filtered.sort((a, b) => {
      let aValue = a[key as keyof typeof a];
      let bValue = b[key as keyof typeof b];

      // Handle date comparison
      if (key === 'redemption_date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
  }, [redemptionHistory?.data, searchTerm, statusFilter, sortConfig]);

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
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        <button
          onClick={() => {
            setShowLinkForm(true);
            setError(null);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Link Student
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Linked Students</h2>
            </div>
            
            {approvedStudents.length === 0 ? (
              <p className="text-gray-500">No approved students yet</p>
            ) : (
              <div className="space-y-4">
                {approvedStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student.student_email)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                      selectedStudent === student.student_email
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    } border`}
                  >
                    <div className="flex items-center">
                      <BookOpen className={`h-5 w-5 ${
                        selectedStudent === student.student_email ? 'text-indigo-600' : 'text-gray-400'
                      } mr-3`} />
                      <span className={`font-medium ${
                        selectedStudent === student.student_email ? 'text-indigo-900' : 'text-gray-700'
                      }`}>
                        {student.student_email}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Student Access</h3>
                  <div className="flex space-x-4">
                    <Link
                      to={`/classes?student=${selectedStudent}`}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      <BookOpen className="h-5 w-5 mr-2" />
                      View Classes
                    </Link>
                    <Link
                      to={`/?student=${selectedStudent}`}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      View Dashboard
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {performance?.map((subject, index) => (
                    <div
                      key={`${subject.id}-${subject.subject}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                          <p className="text-sm text-gray-500">
                            {subject.total_assignments} assignments
                          </p>
                        </div>
                        <p className={`text-lg font-bold ${getGradeColor(subject.current_grade)}`}>
                          {subject.current_grade.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {gradeTrends && gradeTrends.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="h-5 w-5 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Grade Trends</h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gradeTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => new Date(date).toLocaleDateString()}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          labelFormatter={(date) => new Date(date).toLocaleDateString()}
                          formatter={(value) => [`${value}%`]}
                        />
                        <Line
                          type="monotone"
                          dataKey="grade_percentage"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          dot={{ fill: '#4f46e5' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Award className="h-6 w-6 text-indigo-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Award Points</h3>
                </div>

                <form onSubmit={handleAwardPoints} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Points
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pointsToAward}
                      onChange={(e) => setPointsToAward(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reason
                    </label>
                    <input
                      type="text"
                      value={pointReason}
                      onChange={(e) => setPointReason(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g., Excellent test score"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!pointsToAward || !pointReason}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Award Points
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Redemption History</h3>
                  <div className="flex space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search rewards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-3 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('reward_name')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Reward</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('points_cost')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Points</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('redemption_date')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Date</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('status')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Status</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedHistory.map((redemption) => (
                        <tr key={redemption.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{redemption.reward_name}</div>
                            {redemption.reward_description && (
                              <div className="text-sm text-gray-500">{redemption.reward_description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{redemption.points_cost} points</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(redemption.redemption_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(redemption.redemption_date).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              redemption.status === 'approved' ? 'bg-green-100 text-green-800' :
                              redemption.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {redemption.status === 'pending' && (
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => updateRedemptionMutation.mutate({
                                    id: redemption.id,
                                    status: 'approved'
                                  })}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateRedemptionMutation.mutate({
                                    id: redemption.id,
                                    status: 'rejected'
                                  })}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 px-6 py-3 border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing page <span className="font-medium">{currentPage}</span> of{' '}
                          <span className="font-medium">{totalPages}</span>
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a Student
              </h3>
              <p className="text-gray-500">
                Choose a student from the list to view their performance
              </p>
            </div>
          )}
        </div>
      </div>

      {showLinkForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Link Student</h2>
            <form onSubmit={handleLinkStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student Email
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="student@school.edu"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkForm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkStudentMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {linkStudentMutation.isPending ? 'Linking...' : 'Link Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!showAI && <AIToggle onClick={() => setShowAI(true)} />}
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
    </div>
  );
}