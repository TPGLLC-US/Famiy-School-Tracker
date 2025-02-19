import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Award, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import { format } from 'date-fns';
import { getRedemptionHistory } from '../../lib/api';

export function RedemptionHistory() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['redemption-history'],
    queryFn: getRedemptionHistory
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!history?.length) {
    return (
      <div className="text-center py-4">
        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">No redemption history</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((redemption) => (
        <div
          key={redemption.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-indigo-600" />
                <h3 className="font-medium text-gray-900">{redemption.reward_name}</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(redemption.redemption_date), 'MMM d, yyyy h:mm a')}
              </p>
              <p className="text-sm font-medium text-indigo-600 mt-1">
                {redemption.points_cost} points
              </p>
            </div>
            <div className="flex items-center">
              {redemption.status === 'pending' && (
                <div className="flex items-center text-yellow-600">
                  <Clock3 className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
              )}
              {redemption.status === 'approved' && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Approved</span>
                </div>
              )}
              {redemption.status === 'rejected' && (
                <div className="flex items-center text-red-600">
                  <XCircle className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Rejected</span>
                </div>
              )}
            </div>
          </div>
          {redemption.description && (
            <p className="text-sm text-gray-600 mt-2">{redemption.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}