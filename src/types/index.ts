export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent';
  avatarUrl?: string;
}

export interface Grade {
  id: string;
  subjectId: string;
  studentId: string;
  score: number;
  weight: number;
  type: 'test' | 'quiz' | 'homework';
  feedback?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
  description?: string;
  creditHours: number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  officeHours: string;
  department: string;
}