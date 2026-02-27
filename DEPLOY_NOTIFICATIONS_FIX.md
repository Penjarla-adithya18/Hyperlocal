# Deploy Notifications Fix

The chat notifications and translation features require updating your Supabase backend.

## Step 1: Update RLS Policies (Required)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/yecelpnlaruavifzxunw
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- =====================================================
-- Fix Notifications RLS Policies
-- Allows authenticated users to create notifications
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "notif_select_own" ON notifications;
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
DROP POLICY IF EXISTS "notif_update_own" ON notifications;

-- Users can read their own notifications
CREATE POLICY "notif_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Any authenticated user can create notifications (for others)
CREATE POLICY "notif_insert_any" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
```

5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 2: Deploy Updated Edge Function (Required)

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
```powershell
npm install -g supabase
```

2. Link to your project:
```powershell
npx supabase link --project-ref yecelpnlaruavifzxunw
```
(You'll be prompted for your database password)

3. Deploy the notifications function:
```powershell
npx supabase functions deploy notifications
```

### Option B: Manual Deployment via Dashboard

1. Go to **Edge Functions** in your Supabase dashboard
2. Find the `notifications` function
3. Click **Edit**
4. Copy the content from `supabase/functions/notifications/index.ts`
5. Paste it and click **Deploy**

## Step 3: Verify the Fix

1. Open your app in the browser
2. Send a message in the chat
3. Check the browser console - the 403 error should be gone
4. The recipient should receive a notification
5. Test translation by clicking the "Translate" button on a message

## What Was Fixed?

### Before:
- ❌ Only admins could create notifications (403 Forbidden)
- ❌ No INSERT policy on notifications table
- ❌ Translation not working for English locale

### After:
- ✅ Any authenticated user can create notifications for others
- ✅ INSERT policy added to notifications table
- ✅ Translation works for all locales (en ↔ hi ↔ te)
- ✅ Anti-spam protection (can't create notifications for yourself)

## Troubleshooting

### Still getting 403 errors?
- Make sure you ran the SQL in Step 1
- Clear your browser cache (Ctrl+Shift+Del)
- Refresh the page (Ctrl+R)

### Edge function deployment fails?
- Check your Supabase project ID is correct
- Make sure you have the correct permissions
- Try using the dashboard method instead

### Translation not working?
- Check browser console for errors
- Verify GEMINI_API_KEYS are set in .env.local
- Make sure you're not offline

## Need Help?

Check the browser console (F12) for detailed error messages.
