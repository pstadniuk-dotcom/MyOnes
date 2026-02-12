#!/bin/bash

# ONES AI - Database Migration Helper
# Migrates data from Neon to Supabase

set -e

echo "🔄 ONES AI - Database Migration Tool"
echo "===================================="
echo ""

# Check if required tools are installed
command -v pg_dump >/dev/null 2>&1 || { echo "❌ pg_dump is required but not installed. Install PostgreSQL client tools."; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ psql is required but not installed. Install PostgreSQL client tools."; exit 1; }

# Source database (Neon)
SOURCE_DB="postgresql://neondb_owner:npg_QAi9ZGyEvIs6@ep-curly-frog-a6aeyl2v.us-west-2.aws.neon.tech/neondb"

# Target database (Supabase - get from .env)
source ../server/.env
TARGET_DB="$DATABASE_URL"

if [ -z "$TARGET_DB" ]; then
    echo "❌ DATABASE_URL not found in server/.env"
    exit 1
fi

echo "📋 Migration Details:"
echo "  From: Neon Database"
echo "  To: Supabase"
echo ""

# Confirm
read -p "⚠️  This will REPLACE all data in Supabase. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "Step 1: Creating backup from Neon..."
pg_dump "$SOURCE_DB" --clean --if-exists --no-owner --no-privileges > migration-backup.sql
echo "✅ Backup created: migration-backup.sql"
echo ""

echo "Step 2: Restoring to Supabase..."
psql "$TARGET_DB" < migration-backup.sql
echo "✅ Data migrated to Supabase"
echo ""

echo "Step 3: Verifying migration..."
# Count tables in source
SOURCE_COUNT=$(psql "$SOURCE_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')
# Count tables in target
TARGET_COUNT=$(psql "$TARGET_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')

echo "  Source tables: $SOURCE_COUNT"
echo "  Target tables: $TARGET_COUNT"

if [ "$SOURCE_COUNT" -eq "$TARGET_COUNT" ]; then
    echo "✅ Table count matches"
else
    echo "⚠️  Table count mismatch - please verify"
fi

echo ""
echo "🎉 Migration complete!"
echo ""
echo "Next steps:"
echo "  1. Test your application with the new database"
echo "  2. Verify all data is present"
echo "  3. Update Railway environment to use new DATABASE_URL"
echo "  4. Keep migration-backup.sql as a backup"
echo ""
