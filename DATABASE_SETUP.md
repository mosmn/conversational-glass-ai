# Database Setup Guide

## Quick Setup for Development

The Settings/Attachments page requires a PostgreSQL database. Here are your options:

### Option 1: Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL locally**:

   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql

   # Create a database
   createdb conversational_glass_dev
   ```

2. **Add to .env.local**:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/conversational_glass_dev"
   ```

3. **Run the migration**:
   ```bash
   npx drizzle-kit push
   ```

### Option 2: Vercel Postgres (Production Ready)

1. **Create Vercel Postgres database** in your Vercel dashboard
2. **Copy the DATABASE_URL** from Vercel
3. **Add to .env.local**:

   ```env
   DATABASE_URL="your_vercel_postgres_url_here"
   ```

4. **Run the migration**:
   ```bash
   npx drizzle-kit push
   ```

### Option 3: Continue with Mock Data (Current State)

The app is currently configured to show mock data when the database isn't available, so you can continue development and set up the database later.

## Files Table Schema

The migration will create a `files` table with:

- File metadata (name, size, type)
- Storage locations and thumbnails
- User associations and conversation links
- Cleanup tracking (orphaned files, etc.)

## API Endpoints Ready

Once the database is set up, these endpoints will work:

- `/api/files/stats` - Storage usage statistics
- `/api/files/history` - File browsing and search
- `/api/files/cleanup` - Bulk cleanup operations
