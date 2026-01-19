# Issue Tracker

A simple form submission system for Sales Managers and Product Support team.

## Features

- **Sales Manager**: Submit forms with actionable items, LSQ links, URNs, and attachments
- **Product Support**: View all submitted forms and their details
- **Simple Authentication**: Hardcoded password (1111) with role selection
- **Real-time Updates**: Submissions update in real-time via Firestore

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Storage
4. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
5. Add your Firebase configuration values to `.env`:
   - Get values from Firebase Console > Project Settings > Your apps

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules,storage
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

### 6. Deploy to Firebase Hosting

```bash
npm run deploy
```

## Authentication

- **Password**: `1111` (for both roles)
- **Roles**: 
  - Sales Manager - Can submit forms
  - Product Support - Can view all submissions
- Authentication state is stored in localStorage

## Usage

### Sales Manager Flow

1. Login with role "Sales Manager" and password "1111"
2. Fill out the submission form:
   - Select Actionable (required)
   - Enter Detailed Actionable (required)
   - Enter LSQ Link (required)
   - Enter URN (required)
   - Upload Attachment (required)
   - Add Comments/Remarks (optional)
3. Submit form and receive submission ID
4. View submission history

### Product Support Flow

1. Login with role "Product Support" and password "1111"
2. View all submissions in a list
3. Search/filter submissions
4. Click on any submission to view full details
5. View attachments and all form data

## Project Structure

```
src/
├── contexts/          # SimpleAuthContext - authentication logic
├── components/        # Layout, ProtectedRoute
├── pages/            # LoginPage, SubmitPage, SubmissionsListPage, SubmissionDetailPage
├── lib/              # Firebase config, submission service functions
└── types/            # TypeScript type definitions
```

## Form Fields

- **Actionable***: Dropdown selection (required)
- **Detailed Actionable***: Text description (required)
- **LSQ Link***: URL (required)
- **URN of Applicant/Co-Applicant***: Text input (required)
- **Attachment***: File upload (required, max 10MB)
- **Comments/Remarks**: Text area (optional)

## Submission IDs

Submissions are assigned unique IDs in the format: `SUB-0001`, `SUB-0002`, etc.

## Future Enhancements

- Google Sign-in integration
- Email notifications
- Status tracking (pending, in-progress, resolved)
- Comments/notes on submissions
- File type restrictions
- Advanced filtering and sorting
