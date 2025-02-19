import { supabase } from './supabase';
import type { Database } from '../types/database';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface RedemptionHistory {
  id: string;
  student_email: string;
  reward_name: string;
  points_cost: number;
  status: string;
  parent_approval_status: string;
  redemption_date: string;
  redeemed_at: string | null;
  reward_description: string | null;
}

export async function getStudentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('email', user.email)
    .single();

  if (error) throw error;
  return data;
}

export async function getStudentPerformance(studentEmail: string) {
  try {
    // Get classes
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('student', studentEmail);

    if (classError) throw classError;

    // For each class, calculate the weighted grade
    const performanceData = await Promise.all(classes.map(async (classData) => {
      const { data: assignments, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classData.id);

      if (assignmentError) throw assignmentError;

      let totalWeight = 0;
      let weightedSum = 0;

      assignments?.forEach((assignment) => {
        const weight = classData[`${assignment.type}s_percentage`] / 100;
        if (weight) {
          totalWeight += weight;
          weightedSum += (assignment.score / assignment.max_score) * weight;
        }
      });

      const currentGrade = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

      return {
        ...classData,
        current_grade: currentGrade,
        total_assignments: assignments?.length || 0,
        last_assignment_date: assignments?.length ? 
          Math.max(...assignments.map(a => new Date(a.created_at).getTime())) :
          null
      };
    }));

    return performanceData;
  } catch (error) {
    console.error('Error calculating student performance:', error);
    throw error;
  }
}

export async function getStudentGradeTrends(studentEmail: string) {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      classes!inner (
        student,
        subject
      )
    `)
    .eq('classes.student', studentEmail)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getStudentSubjects(studentId: string) {
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      *,
      grades (*)
    `)
    .eq('student_id', studentId);

  if (error) throw error;
  return data;
}

export async function getSubjectGrades(subjectId: string) {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('subject_id', subjectId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createGrade(grade: {
  subject_id: string;
  type: 'test' | 'quiz' | 'homework';
  score: number;
  max_score: number;
  date: string;
  feedback?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('grades')
    .insert([{
      ...grade,
      student_id: user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createGradeAlert(alert: Database['public']['Tables']['grade_alerts']['Insert']) {
  const { data, error } = await supabase
    .from('grade_alerts')
    .insert([alert])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGradeAlerts(studentId: string) {
  const { data, error } = await supabase
    .from('grade_alerts')
    .select(`
      *,
      subjects (name)
    `)
    .eq('student_id', studentId);

  if (error) throw error;
  return data;
}

export async function linkStudentToParent(studentEmail: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('parent_students')
    .insert([{
      parent_id: user.id,
      student_email: studentEmail,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLinkedStudents() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('parent_students')
    .select(`
      id,
      student_email,
      status
    `)
    .eq('parent_id', user.id);

  if (error) throw error;
  return data;
}

export async function createReward(reward: {
  name: string;
  description: string;
  points_cost: number;
  status?: 'pending' | 'approved' | 'rejected';
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('rewards')
    .insert([{
      ...reward,
      created_by: user.id,
      status: reward.status || (userRole?.role === 'parent' ? 'approved' : 'pending'),
      is_active: userRole?.role === 'parent'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAvailableRewards() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .or(
      userRole?.role === 'parent'
        ? 'status.eq.pending,status.eq.approved'
        : 'status.eq.approved'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateRewardStatus(rewardId: string, status: 'approved' | 'rejected') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (userRole?.role !== 'parent') {
    throw new Error('Only parents can update reward status');
  }

  const { data, error } = await supabase
    .from('rewards')
    .update({ 
      status,
      is_active: status === 'approved'
    })
    .eq('id', rewardId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function redeemReward(rewardId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // First check if the user has enough points
  const { data: points, error: pointsError } = await supabase
    .from('achievement_points')
    .select('points')
    .eq('student_email', user.email);

  if (pointsError) throw pointsError;

  const totalPoints = points?.reduce((sum, p) => sum + p.points, 0) || 0;

  // Get reward details
  const { data: reward, error: rewardError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();

  if (rewardError) throw rewardError;

  // Validate reward
  if (!reward) {
    throw new Error('Reward not found');
  }

  if (reward.status !== 'approved') {
    throw new Error('This reward is not available for redemption');
  }

  if (!reward.is_active) {
    throw new Error('This reward is no longer active');
  }

  if (totalPoints < reward.points_cost) {
    throw new Error(`Insufficient points. You need ${reward.points_cost} points but have ${totalPoints}`);
  }

  // Check if already redeemed
  const { data: existingRedemption, error: redemptionError } = await supabase
    .from('student_rewards')
    .select('*')
    .eq('student_email', user.email)
    .eq('reward_id', rewardId)
    .not('status', 'eq', 'rejected')
    .maybeSingle();

  if (redemptionError) throw redemptionError;

  if (existingRedemption) {
    throw new Error('You have already redeemed this reward');
  }

  // Create redemption record
  const { data: redemption, error: createError } = await supabase
    .from('student_rewards')
    .insert([{
      student_email: user.email,
      reward_id: rewardId,
      status: 'pending',
      parent_approval_status: 'pending'
    }])
    .select()
    .single();

  if (createError) {
    if (createError.code === '42501') {
      throw new Error('You do not have permission to redeem this reward');
    }
    throw createError;
  }

  return redemption;
}

export async function updateRewardRedemptionStatus(redemptionId: string, status: 'approved' | 'rejected') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user is a parent
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (userRole?.role !== 'parent') {
    throw new Error('Only parents can update redemption status');
  }

  const { data, error } = await supabase
    .from('student_rewards')
    .update({ 
      status,
      parent_approval_status: status,
      redeemed_at: status === 'approved' ? new Date().toISOString() : null
    })
    .eq('id', redemptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRedemptionHistory(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<RedemptionHistory>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('student_rewards')
    .select(`
      id,
      student_email,
      rewards (
        name,
        description,
        points_cost
      ),
      status,
      parent_approval_status,
      created_at,
      redeemed_at
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const formattedData = data?.map(item => ({
    id: item.id,
    student_email: item.student_email,
    reward_name: item.rewards.name,
    reward_description: item.rewards.description,
    points_cost: item.rewards.points_cost,
    status: item.status,
    parent_approval_status: item.parent_approval_status,
    redemption_date: item.created_at,
    redeemed_at: item.redeemed_at
  })) || [];

  return {
    data: formattedData,
    total: count || 0
  };
}

export async function getPendingRedemptions(parentId: string) {
  const { data, error } = await supabase
    .from('student_rewards')
    .select(`
      id,
      student_email,
      rewards (
        name,
        points_cost
      ),
      created_at,
      status,
      parent_approval_status
    `)
    .eq('parent_approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(item => ({
    id: item.id,
    student_email: item.student_email,
    reward_name: item.rewards.name,
    points_cost: item.rewards.points_cost,
    redemption_date: item.created_at,
    status: item.status,
    parent_approval_status: item.parent_approval_status
  }));
}

export async function getUserRole(userId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First try to get existing role
    const { data: existingRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError && roleError.code !== 'PGRST116') {
      throw roleError;
    }

    // If no role exists, create one with default role 'student'
    if (!existingRole) {
      const { data: newRole, error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: 'student' }])
        .select('role')
        .single();

      if (insertError) throw insertError;
      return newRole?.role || 'student';
    }

    return existingRole?.role || 'student';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'student';
  }
}

export async function getParentStudentRequests(studentEmail: string) {
  const { data, error } = await supabase
    .from('parent_students')
    .select('*')
    .eq('student_email', studentEmail)
    .eq('status', 'pending');

  if (error) throw error;
  return data;
}

export async function updateParentStudentStatus(requestId: string, status: 'approved' | 'rejected') {
  const { data, error } = await supabase
    .from('parent_students')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClass(classId: string, updates: {
  subject?: string;
  teacher?: string;
  email?: string;
  room_number?: string;
  extra_help_day?: string;
  extra_help_time?: string;
  tests_percentage?: number;
  quizzes_percentage?: number;
  homework_percentage?: number;
  participation_percentage?: number;
  projects_percentage?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', classId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveApiKey(apiKey: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Encrypt the API key before storing
  const encryptedKey = await encryptApiKey(apiKey);

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      openai_key: encryptedKey,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getApiKey() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_settings')
    .select('openai_key')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data?.openai_key) return null;

  // Decrypt the API key before returning
  return decryptApiKey(data.openai_key);
}

export async function awardPoints(studentEmail: string, points: number, reason: string) {
  // Input validation
  if (!studentEmail) throw new Error('Student email is required');
  if (!points || points <= 0) throw new Error('Points must be a positive number');
  if (!reason) throw new Error('Reason is required');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify the user is a parent
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (userRole?.role !== 'parent') {
    throw new Error('Only parents can award points');
  }

  // Verify the parent is linked to the student
  const { data: parentStudent } = await supabase
    .from('parent_students')
    .select('status')
    .eq('parent_id', user.id)
    .eq('student_email', studentEmail)
    .single();

  if (!parentStudent || parentStudent.status !== 'approved') {
    throw new Error('Not authorized to award points to this student');
  }

  // Award the points
  const { data, error } = await supabase
    .from('achievement_points')
    .insert([{
      student_email: studentEmail,
      points,
      reason,
      awarded_by: user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStudentPoints(studentEmail: string) {
  if (!studentEmail) throw new Error('Student email is required');

  const { data, error } = await supabase
    .from('achievement_points')
    .select('*')
    .eq('student_email', studentEmail)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Encryption helpers (implement secure encryption/decryption)
async function encryptApiKey(apiKey: string): Promise<string> {
  // This is a simplified example. In production, use a proper encryption library
  // and secure key management system
  return btoa(apiKey);
}

async function decryptApiKey(encryptedKey: string): Promise<string> {
  // This is a simplified example. In production, use a proper encryption library
  // and secure key management system
  return atob(encryptedKey);
}