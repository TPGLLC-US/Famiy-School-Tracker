import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateGPA(grades: number[]): number {
  if (grades.length === 0) return 0;
  return Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2));
}

export function getGradeColor(grade: number): string {
  if (grade >= 90) return 'text-green-500';
  if (grade >= 80) return 'text-blue-500';
  if (grade >= 70) return 'text-yellow-500';
  return 'text-red-500';
}