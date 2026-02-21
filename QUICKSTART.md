# Quick Start Guide - HyperLocal Job Platform

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Development Server
```bash
pnpm dev
```

### 3. Open in Browser
Navigate to: **http://localhost:3000**

## 🎯 Testing the Platform

### Create Test Accounts

#### Worker Account
1. Go to http://localhost:3000/signup
2. Select "Looking for Work"
3. Fill in details:
   - Name: Test Worker
   - Email: worker@test.com
   - Phone: 9876543210
   - Password: Test@123
4. Enter OTP: **123456** (any 6 digits work in mock mode)
5. Complete profile with skills

#### Employer Account
1. Go to http://localhost:3000/signup
2. Select "Looking to Hire"
3. Fill in details:
   - Name: Test Employer
   - Email: employer@test.com
   - Phone: 9876543211
   - Company: Test Company
   - Password: Test@123
4. Enter OTP: **123456**

#### Admin Account
Admin accounts need to be created manually in the code.
Check `/lib/mockDb.ts` for seeded admin accounts.

## 🔄 User Flows to Test

### Worker Flow
1. **Sign up** → Complete profile → Add skills
2. **Browse Jobs** → See AI-recommended matches
3. **Apply to Job** → Write cover letter → Submit
4. **Check Applications** → Track status
5. **Chat** → Message with employers
6. **View Dashboard** → See stats and trust score

### Employer Flow
1. **Sign up** → Complete company profile
2. **Post a Job** → Fill job details → Select skills → Set payment
3. **Manage Jobs** → View applications
4. **Review Applications** → Accept/Reject candidates
5. **Chat** → Discuss with workers
6. **View Dashboard** → Monitor job statistics

### Admin Flow
1. **Login** as admin
2. **View Dashboard** → Check platform stats
3. **Manage Users** → Verify or ban users
4. **Review Reports** → Resolve moderation issues
5. **Monitor Escrow** → Track payments

## 📱 Responsive Testing

Test on different screen sizes:
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1440px (Laptop)

All pages are fully responsive with mobile-first design.

## 🎨 Design Features

- **Purple Theme**: Primary brand color throughout
- **White Backgrounds**: Clean, professional look
- **Smooth Animations**: Hover effects and transitions
- **Modern UI**: Cards, badges, and clean typography
- **Icons**: Lucide icons for consistency

## 📊 Mock Data

The platform includes pre-seeded data in `/lib/mockDb.ts`:
- Sample users (workers and employers)
- Sample jobs across categories
- Sample applications
- Sample chat conversations
- Sample ratings and reviews

## 🧪 Key Features to Explore

### AI Matching
- Workers see "Recommended" tab with match scores
- Matches based on skills, location, and experience
- 70%+ match shows badge on job cards

### Trust Score System
- Displayed on all user profiles
- Calculated from completed jobs, ratings, disputes
- Visible to both workers and employers

### Escrow Payments
- Jobs can be marked as "escrow required"
- Simulated payment flow
- Admin can monitor escrow transactions

### In-App Chat
- Real-time messaging simulation
- Unread message badges
- Search conversations
- Message history

### Admin Tools
- User management with verify/ban actions
- Report moderation system
- Platform statistics dashboard
- Trust and safety monitoring

## 🔐 Authentication Notes

- **OTP**: Any 6 digits work (e.g., 123456)
- **Sessions**: Stored in localStorage
- **Roles**: worker, employer, admin
- **Routing**: Automatic redirect based on role

## 📁 Important Files

- `/lib/types.ts` - All TypeScript interfaces
- `/lib/mockDb.ts` - Mock database with all data
- `/lib/aiMatching.ts` - AI matching algorithms
- `/contexts/AuthContext.tsx` - Authentication state
- `/app/globals.css` - Theme configuration

## ⚠️ Known Limitations (Mock Mode)

1. **No Persistence**: Data resets on page refresh
2. **No Real SMS**: OTP accepts any 6 digits
3. **No Real Payments**: Escrow is simulated
4. **No Real-Time**: Chat updates on action only
5. **No File Uploads**: Profile photos not implemented yet
6. **No Search**: Basic filtering only

## 🚧 Next Steps for Production

See `IMPLEMENTATION_DOCS.md` for comprehensive deployment guide.

**Critical Requirements:**
1. Database (PostgreSQL/MongoDB)
2. Authentication Service (NextAuth/Clerk)
3. SMS Gateway (Twilio/MSG91)
4. Payment Gateway (Razorpay/Stripe)
5. File Storage (Vercel Blob/S3)
6. Real-time Service (Pusher/Ably)

## 📝 Development Tips

### Adding New Features
1. Add types in `/lib/types.ts`
2. Add mock data functions in `/lib/mockDb.ts`
3. Create page in appropriate folder (worker/employer/admin)
4. Use existing components from `/components/ui`
5. Follow purple theme in design

### Debugging
- Check browser console for errors
- Mock DB logs all operations
- Use React DevTools for component state
- Check Network tab for any issues

### Code Style
- TypeScript strict mode enabled
- Tailwind CSS for all styling
- Functional components with hooks
- Comments for complex logic

## 🎓 Learning Resources

- **Next.js 16**: https://nextjs.org/docs
- **React 19**: https://react.dev
- **Tailwind CSS v4**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
- **TypeScript**: https://typescriptlang.org

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use different port
pnpm dev -- -p 3001
```

### Dependencies Not Installing
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Page Not Found
- Ensure you're using correct URLs
- Check file structure matches routes
- Restart dev server

## 📧 Support

For questions about the codebase:
1. Check `IMPLEMENTATION_DOCS.md` for detailed documentation
2. Review component files for inline comments
3. Check `/lib/types.ts` for data structure
4. Examine `/lib/mockDb.ts` for API patterns

---

**Happy Coding! 🎉**
