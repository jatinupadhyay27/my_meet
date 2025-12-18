# Environment Variables Setup

## Required Credentials for `.env` file

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Connection String
# Replace these placeholders with your actual PostgreSQL credentials:
# - username: Your PostgreSQL username
# - password: Your PostgreSQL password
# - localhost: Your database host (usually 'localhost' for local)
# - 5432: PostgreSQL port (usually 5432)
# - my_meet_db: Your database name (create this database first if it doesn't exist)
DATABASE_URL="postgresql://username:password@localhost:5432/my_meet_db?schema=public"

# Server Port (optional, defaults to 4000)
PORT=4000

# Environment (optional, defaults to 'development')
NODE_ENV=development
```

## Example with actual values:

```env
DATABASE_URL="postgresql://postgres:mypassword123@localhost:5432/meet_app?schema=public"
PORT=4000
NODE_ENV=development
```

## Steps to Setup:

1. **Create the `.env` file** in `backend/` directory
2. **Fill in your PostgreSQL credentials** in the format shown above
3. **Create the database** in PostgreSQL (if it doesn't exist):
   ```bash
   createdb my_meet_db
   ```
   Or use psql:
   ```bash
   psql -U postgres
   CREATE DATABASE my_meet_db;
   ```
4. **Run the setup command** which will create/update all tables:
   ```bash
   cd backend
   npm run db:setup
   ```

This command will:
- Generate Prisma Client
- Create/update all database tables based on your schema
- Seed initial demo data

