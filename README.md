# Stock Management System

A Next.js application for managing stock, built with the app router.

## Features

- Built with Next.js 16 and App Router
- Styled with Tailwind CSS and dark theme
- Form handling with react-hook-form
- Date manipulations with date-fns
- Database integration with Supabase
- Inventory management with CRUD operations
- Search and sort functionality
- Low stock alerts
- Data visualization with charts
- Item categories
- Responsive design with icons

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Dependencies

- @supabase/supabase-js
- tailwindcss
- react-hook-form
- date-fns

## Tailwind CSS Setup

Tailwind CSS is already configured. The configuration files are:

- `tailwind.config.js`
- `postcss.config.mjs`
- `src/app/globals.css` (with Tailwind directives)

To set up Tailwind CSS manually (if needed):

1. Install Tailwind CSS:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   ```

2. Initialize Tailwind config:
   ```bash
   npx tailwindcss init -p
   ```

3. Add Tailwind directives to your CSS (e.g., `src/app/globals.css`):
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. Configure `tailwind.config.js`:
   ```js
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: [
       "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
       "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
       "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

## Supabase Setup

1. **Create a Supabase Account**:
   - Go to [supabase.com](https://supabase.com) and sign up for a free account.

2. **Create a New Project**:
   - Click "New Project" in your dashboard.
   - Choose your organization, enter a project name (e.g., "stock-management").
   - Select a database password and region.
   - Click "Create new project".

3. **Wait for Project Setup**:
   - It takes a few minutes for the project to be fully set up.

4. **Get API Keys**:
   - Go to Settings > API in your project dashboard.
   - Copy the "Project URL" and "anon public" key.

5. **Update Environment Variables**:
   - Open `.env.local` in your project root.
   - Replace the placeholder values:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ```

6. **Create the Database Table**:
   - Go to the SQL Editor in your Supabase dashboard.
   - Copy and paste the contents of `supabase-setup.sql` from your project root.
   - Click "Run" to execute the query.

7. **Enable Row Level Security (Optional but Recommended)**:
   - Go to Authentication > Policies in your dashboard.
   - For the `items` table, create policies to allow read/write access.
   - For development, you can allow all operations for authenticated users.

8. **Test the Connection**:
   - Restart your development server: `npm run dev`
   - Try adding an item - it should now save to Supabase instead of using mock data.

### Troubleshooting

- **Build Errors**: If you see Supabase errors during build, ensure your environment variables are set correctly.
- **Permission Errors**: Check your RLS policies in Supabase.
- **Connection Issues**: Verify your project URL and API key are correct.

## Project Structure

- `src/app/` - App router pages (Dashboard, Inventory, Add Item, Reports)
- `src/components/` - Reusable components (Navbar, Modal)
- `src/lib/` - Utility libraries (Supabase client)
- `public/` - Static assets
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.mjs` - PostCSS configuration

## Git Repository

The project has been initialized with Git. To push to a remote repository:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```
