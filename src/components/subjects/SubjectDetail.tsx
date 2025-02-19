import React from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Mail, Clock, AlertTriangle } from 'lucide-react';
import { getGradeColor } from '../../lib/utils';

interface GradeEntry {
  id: string;
  type: 'test' | 'quiz' | 'homework';
  score: number;
  max_score: number;
  weight: number;
  feedback?: string;
  date: string;
}

interface SubjectDetailProps {
  subject: {
    name: string;
    teacher_name: string;
    teacher_email: string;
    grades: GradeEntry[];
  };
}

export function SubjectDetail({ subject }: SubjectDetailProps) {
  const calculateWeightedAverage = (grades: GradeEntry[]) => {
    const totalWeight = grades.reduce((sum, grade) => sum + grade.weight, 0);
    const weightedSum = grades.reduce((sum, grade) => 
      sum + (grade.score / grade.max_score) * grade.weight * 100, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const groupedGrades = subject.grades.reduce((acc, grade) => {
    if (!acc[grade.type]) {
      acc[grade.type] = [];
    }
    acc[grade.type].push(grade);
    return acc;
  }, {} as Record<string, GradeEntry[]>);

  const currentGrade = calculateWeightedAverage(subject.grades);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
            <div className="flex items-center mt-2 text-gray-600">
              <BookOpen className="h-5 w-5 mr-2" />
              <span>{subject.teacher_name}</span>
            </div>
            <div className="flex items-center mt-1 text-gray-600">
              <Mail className="h-5 w-5 mr-2" />
              <a href={`mailto:${subject.teacher_email}`} className="hover:text-indigo-600">
                {subject.teacher_email}
              </a>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Current Grade</p>
            <p className={`text-3xl font-bold ${getGradeColor(currentGrade)}`}>
              {currentGrade.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Breakdown</h2>
          <div className="space-y-6">
            {Object.entries(groupedGrades).map(([type, grades]) => {
              const typeAverage = calculateWeightedAverage(grades);
              return (
                <div key={type} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900 capitalize">{type}</h3>
                    <span className={`font-semibold ${getGradeColor(typeAverage)}`}>
                      {typeAverage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-3">
                    {grades.map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">
                              {new Date(grade.date).toLocaleDateString()}
                            </span>
                          </div>
                          {grade.feedback && (
                            <div className="flex items-start mt-1">
                              <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" />
                              <p className="text-sm text-gray-600">{grade.feedback}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${getGradeColor((grade.score / grade.max_score) * 100)}`}>
                            {grade.score} / {grade.max_score}
                          </p>
                          <p className="text-sm text-gray-500">Weight: {grade.weight}x</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}