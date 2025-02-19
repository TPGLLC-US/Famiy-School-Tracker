/*
  # Recreate Classes and Grades tables with consistent column casing

  1. Changes
    - Drop existing tables
    - Recreate tables with consistent lowercase column names
    - Add proper indexes and RLS policies
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to view their own data
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS Classes CASCADE;
DROP TABLE IF EXISTS Grades CASCADE;

-- Create Classes table
CREATE TABLE Classes (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL,
  student TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher TEXT NOT NULL,
  image TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  extra_help_day TEXT,
  extra_help_time TIME,
  room_number INTEGER,
  tests_percentage TEXT,
  quizzes_percentage TEXT,
  homework_percentage TEXT,
  participation_percentage TEXT,
  projects_percentage TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Grades table with consistent lowercase naming
CREATE TABLE Grades (
  uuid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course TEXT NOT NULL,
  category TEXT NOT NULL,
  assignment_name TEXT NOT NULL,
  date TEXT NOT NULL,
  max_score DOUBLE PRECISION NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  percentage DOUBLE PRECISION NOT NULL,
  subject TEXT NOT NULL,
  teacher TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for frequently queried columns
CREATE INDEX idx_classes_student ON Classes(student);
CREATE INDEX idx_classes_subject ON Classes(subject);
CREATE INDEX idx_grades_course ON Grades(course);
CREATE INDEX idx_grades_category ON Grades(category);

-- Enable Row Level Security
ALTER TABLE Classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE Grades ENABLE ROW LEVEL SECURITY;

-- Create policies for Classes
CREATE POLICY "Users can view their own classes"
  ON Classes
  FOR SELECT
  TO authenticated
  USING (student = auth.jwt() ->> 'email');

-- Create policies for Grades
CREATE POLICY "Users can view their own grades"
  ON Grades
  FOR SELECT
  TO authenticated
  USING (course IN (
    SELECT subject 
    FROM Classes 
    WHERE student = auth.jwt() ->> 'email'
  ));