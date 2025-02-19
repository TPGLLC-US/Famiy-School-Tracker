/*
  # Initial Schema Setup for Student Grade Dashboard

  1. New Tables
    - students
      - id (uuid, primary key)
      - name (text)
      - email (text, unique)
      - grade_level (integer)
      - created_at (timestamp)
    
    - subjects
      - id (uuid, primary key)
      - name (text)
      - teacher_name (text)
      - teacher_email (text)
      - student_id (uuid, foreign key)
      - created_at (timestamp)
    
    - grades
      - id (uuid, primary key)
      - subject_id (uuid, foreign key)
      - student_id (uuid, foreign key)
      - type (enum: test, quiz, homework)
      - score (numeric)
      - max_score (numeric)
      - weight (numeric)
      - feedback (text)
      - date (date)
      - created_at (timestamp)
    
    - grade_alerts
      - id (uuid, primary key)
      - student_id (uuid, foreign key)
      - subject_id (uuid, foreign key)
      - type (enum: low, high)
      - threshold (numeric)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Create custom types
CREATE TYPE grade_type AS ENUM ('test', 'quiz', 'homework');
CREATE TYPE alert_type AS ENUM ('low', 'high');

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  grade_level integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_name text NOT NULL,
  teacher_email text NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  type grade_type NOT NULL,
  score numeric NOT NULL CHECK (score >= 0),
  max_score numeric NOT NULL CHECK (max_score > 0),
  weight numeric NOT NULL DEFAULT 1 CHECK (weight > 0),
  feedback text,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create grade_alerts table
CREATE TABLE IF NOT EXISTS grade_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  threshold numeric NOT NULL CHECK (threshold >= 0 AND threshold <= 100),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own student data"
  ON students
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can read own subjects"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (student_id::text = auth.uid()::text);

CREATE POLICY "Users can read own grades"
  ON grades
  FOR SELECT
  TO authenticated
  USING (student_id::text = auth.uid()::text);

CREATE POLICY "Users can read own alerts"
  ON grade_alerts
  FOR SELECT
  TO authenticated
  USING (student_id::text = auth.uid()::text);