import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock } from 'lucide-react';
import { updateRewardRedemptionStatus } from '../../lib/api';

interface PendingRedemption {
  id: string;
  student_email: string;
  reward_name: string;
  points_cost: number;
  redemption_date: string;
}

interface ParentApprovalDashboardProps {
  pendingRedemptions: PendingRedemption[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}

export function ParentApprovalDashboard({
  pendingRedemptions,
  isLoading,
  onApprove,
  onReject,
  isPending
}: ParentApprovalDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (pendingRedemptions.length === 0) {
    return (
      <div className="text-center py-4">
        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">No pending redemption requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingRedemptions.map((redemption) => (
        <div
          key={redemption.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">{redemption.reward_name}</h3>
              <p className="text-sm text-gray-500">
                Requested by: {redemption.student_email}
              </p>
              <p className="text-sm text-gray-500">
                Date: {new Date(redemption.redemption_date).toLocaleDateString()}
              </p>
              <p className="text-sm font-medium text-indigo-600 mt-1">
                {redemption.points_cost} points
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onApprove(redemption.id)}
                disabled={isPending}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-50"
                title="Approve"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => onReject(redemption.id)}
                disabled={isPending}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full disabled:opacity-50"
                title="Reject"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}