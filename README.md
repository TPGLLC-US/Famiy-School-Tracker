# Student Grade Dashboard

A comprehensive grade tracking and management system for students and parents.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_GITHUB_USERNAME/student-grade-dashboard)

## Features

- 📊 Real-time grade tracking and visualization
- 👨‍👩‍👧‍👦 Parent-student connection system
- 🏆 Achievement and rewards system
- 📱 Responsive design for all devices
- 🔒 Secure authentication with Supabase
- 🎯 Goal setting and progress tracking

## Tech Stack

- React + TypeScript
- Vite
- Supabase
- TanStack Query
- Tailwind CSS
- Lucide Icons
- Chart.js
- React Router

## Quick Start

1. Clone the repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/student-grade-dashboard.git
cd student-grade-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server
```bash
npm run dev
```



## Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Get your project credentials:
   - Go to Project Settings > API
   - Copy the Project URL and paste it as `VITE_SUPABASE_URL` in your `.env` file
   - Copy the `anon` public key and paste it as `VITE_SUPABASE_ANON_KEY` in your `.env` file

3. Set up the database:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/migrations/20250213003142_initial_setup.sql`
   - Paste and run the SQL in the editor

4. Test the setup:
   - Start the application with `npm run dev`
   - Create an account with email `test@example.com`
   - You should see some test data in the dashboard

## Demo Account

Use these credentials to test the application:
- Email: `test@example.com`
- Password: (create your own during signup)

The test account comes with pre-populated data including:
- Sample classes (Mathematics and Science)
- Grade distributions
- Parent connection features

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.