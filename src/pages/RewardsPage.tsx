import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, Star, Plus, AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  getAvailableRewards, 
  createReward, 
  redeemReward, 
  getStudentPoints, 
  getUserRole, 
  updateRewardStatus, 
  updateRewardRedemptionStatus,
  getRedemptionHistory 
} from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export function RewardsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [pointsCost, setPointsCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const pageSize = 10;

  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: () => getUserRole(user?.id || ''),
    enabled: !!user?.id
  });

  const { data: rewards } = useQuery({
    queryKey: ['rewards'],
    queryFn: getAvailableRewards
  });

  const { data: points } = useQuery({
    queryKey: ['student-points', user?.email],
    queryFn: () => getStudentPoints(user?.email || ''),
    enabled: !!user?.email
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['redemption-history', currentPage],
    queryFn: () => getRedemptionHistory(currentPage, pageSize),
    enabled: !!user?.email
  });

  const createRewardMutation = useMutation({
    mutationFn: (reward: { name: string; description: string; points_cost: number }) =>
      createReward({
        ...reward,
        status: userRole === 'parent' ? 'approved' : 'pending'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setShowCreateForm(false);
      setRewardName('');
      setRewardDescription('');
      setPointsCost('');
      setError(null);
      setSuccessMessage('Reward created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });

  const updateRewardStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      updateRewardStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setError(null);
      setSuccessMessage('Reward status updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });

  const redeemRewardMutation = useMutation({
    mutationFn: redeemReward,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['student-points'] });
      setError(null);
      setSuccessMessage(
        data.requiresParentApproval
          ? 'Reward redemption request submitted! Waiting for parent approval.'
          : 'Reward redeemed successfully!'
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  });

  const updateRedemptionStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      updateRewardRedemptionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemption-history'] });
      setSuccessMessage(`Reward redemption ${status} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  });

  const totalPoints = points?.reduce((sum, p) => sum + p.points, 0) || 0;
  const totalPages = Math.ceil((history?.total || 0) / pageSize);

  const handleCreateReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName || !pointsCost) {
      setError('Please fill in all required fields');
      return;
    }

    createRewardMutation.mutate({
      name: rewardName,
      description: rewardDescription,
      points_cost: parseInt(pointsCost)
    });
  };

  const handleRedeemReward = async (rewardId: string, pointsCost: number) => {
    if (totalPoints < pointsCost) {
      setError(`You need ${pointsCost} points to redeem this reward. You currently have ${totalPoints} points.`);
      return;
    }

    try {
      await redeemRewardMutation.mutateAsync(rewardId);
    } catch (err) {
      // Error is handled by mutation onError
    }
  };

  const filteredRewards = rewards?.filter(reward => 
    userRole === 'parent' || reward.status === 'approved'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rewards</h1>
          <p className="text-gray-600">Your Points: {totalPoints}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          {userRole === 'parent' ? 'Create Reward' : 'Request Reward'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRewards?.map((reward) => (
              <div
                key={reward.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Gift className="h-6 w-6 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{reward.name}</h3>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-1" />
                    <span className="font-medium">{reward.points_cost}</span>
                  </div>
                </div>

                {reward.description && (
                  <p className="text-gray-600 mb-4">{reward.description}</p>
                )}

                {reward.status === 'pending' && userRole === 'parent' ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateRewardStatusMutation.mutate({
                        id: reward.id,
                        status: 'approved'
                      })}
                      disabled={updateRewardStatusMutation.isPending}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {updateRewardStatusMutation.isPending ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateRewardStatusMutation.mutate({
                        id: reward.id,
                        status: 'rejected'
                      })}
                      disabled={updateRewardStatusMutation.isPending}
                      className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {updateRewardStatusMutation.isPending ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRedeemReward(reward.id, reward.points_cost)}
                    disabled={
                      totalPoints < reward.points_cost || 
                      reward.status === 'pending' ||
                      redeemRewardMutation.isPending
                    }
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {redeemRewardMutation.isPending ? 'Redeeming...' : 
                      reward.status === 'pending' ? 'Pending Approval' : 
                      totalPoints < reward.points_cost ? `Need ${reward.points_cost - totalPoints} more points` :
                      'Redeem Reward'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Redemption History</h2>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : history?.data.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No redemption history</p>
            ) : (
              <div className="space-y-4">
                {history?.data.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="border-b border-gray-200 last:border-0 pb-4 last:pb-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{redemption.reward_name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(redemption.redemption_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{redemption.points_cost} points</p>
                        <span className={`text-sm ${
                          redemption.status === 'redeemed' ? 'text-green-600' :
                          redemption.status === 'rejected' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    {redemption.reward_description && (
                      <p className="mt-2 text-sm text-gray-600">{redemption.reward_description}</p>
                    )}
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-4 pt-4">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {userRole === 'parent' ? 'Create Reward' : 'Request New Reward'}
            </h2>
            <form onSubmit={handleCreateReward} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reward Name
                </label>
                <input
                  type="text"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Extra Screen Time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe the reward..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Points Cost
                </label>
                <input
                  type="number"
                  min="1"
                  value={pointsCost}
                  onChange={(e) => setPointsCost(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRewardMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {createRewardMutation.isPending 
                    ? 'Creating...' 
                    : userRole === 'parent' ? 'Create Reward' : 'Submit Request'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}