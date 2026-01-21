# Copy-Paste Guide: Exact Files & Folders to Transfer

## Quick Copy Checklist

Copy these files/folders exactly as listed below to your new project.

---

## 📁 Root Level Files (Copy These)

### Essential Configuration Files

```
✅ vite.config.ts
✅ tsconfig.json
✅ tsconfig.node.json
✅ tailwind.config.js
✅ postcss.config.js
✅ package.json (copy scripts section and devDependencies)
✅ .env.example
✅ .gitignore
✅ firebase.json
✅ firestore.rules
✅ storage.rules
✅ firestore.indexes.json
✅ index.html
```

**Location:** All in project root directory

---

## 📁 Source Folder Structure (Copy Entire Folders)

### Option 1: Copy Entire `src` Folder Structure

```
✅ src/
   ├── contexts/
   │   └── SimpleAuthContext.tsx
   ├── components/
   │   ├── Layout.tsx
   │   └── ProtectedRoute.tsx
   ├── lib/
   │   ├── firebase.ts
   │   └── submissions.ts (or rename to your service)
   ├── types/
   │   └── index.ts
   ├── App.tsx
   ├── main.tsx
   ├── index.css
   └── vite-env.d.ts
```

### Option 2: Copy Specific Files Only

If you only want the patterns (not the pages):

```
✅ src/
   ├── contexts/
   │   └── SimpleAuthContext.tsx (adapt to your auth)
   ├── components/
   │   ├── Layout.tsx (adapt navigation)
   │   └── ProtectedRoute.tsx (keep as-is, works for any auth)
   ├── lib/
   │   ├── firebase.ts (keep as-is, just update config)
   │   └── submissions.ts (use as template for your services)
   ├── types/
   │   └── index.ts (use as template)
   ├── App.tsx (use routing pattern)
   ├── main.tsx (keep as-is)
   ├── index.css (keep Tailwind setup)
   └── vite-env.d.ts (keep as-is)
```

---

## 📋 Detailed File-by-File Guide

### 1. Build Configuration

**File:** `vite.config.ts`
- ✅ Copy entire file
- ⚠️ Adjust `manualChunks` based on your dependencies
- ⚠️ Update path alias if needed

**File:** `tsconfig.json`
- ✅ Copy entire file
- ⚠️ Adjust paths if your structure differs

**File:** `tsconfig.node.json`
- ✅ Copy entire file
- ✅ No changes needed

**File:** `tailwind.config.js`
- ✅ Copy entire file
- ⚠️ Customize colors/branding
- ⚠️ Update content paths if needed

**File:** `postcss.config.js`
- ✅ Copy entire file
- ✅ No changes needed

---

### 2. Package Configuration

**File:** `package.json`
- ✅ Copy these sections:
  ```json
  {
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview",
      "deploy": "npm run build && firebase deploy",
      "deploy:hosting": "npm run build && firebase deploy --only hosting",
      "deploy:rules": "firebase deploy --only firestore:rules,storage"
    }
  }
  ```
- ✅ Copy these devDependencies:
  ```json
  {
    "@types/react": "^18.2.46",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.10"
  }
  ```
- ⚠️ Add your own dependencies

---

### 3. Environment & Git

**File:** `.env.example`
- ✅ Copy entire file
- ⚠️ Update with your environment variables

**File:** `.gitignore`
- ✅ Copy entire file
- ⚠️ Add any project-specific ignores

---

### 4. Firebase Configuration

**File:** `firebase.json`
- ✅ Copy entire file
- ⚠️ Update project ID if different

**File:** `firestore.rules`
- ✅ Copy entire file
- ⚠️ Adjust rules for your collections

**File:** `storage.rules`
- ✅ Copy entire file
- ⚠️ Adjust paths for your storage structure

**File:** `firestore.indexes.json`
- ✅ Copy entire file
- ⚠️ Add your own indexes

---

### 5. HTML Entry Point

**File:** `index.html`
- ✅ Copy entire file
- ⚠️ Update title if needed

---

### 6. Source Code Files

#### Core Files (Keep Structure)

**File:** `src/main.tsx`
- ✅ Copy entire file
- ✅ No changes needed

**File:** `src/App.tsx`
- ✅ Copy file
- ⚠️ Update routes for your pages
- ⚠️ Update auth context name if different

**File:** `src/index.css`
- ✅ Copy entire file
- ✅ No changes needed (Tailwind setup)

**File:** `src/vite-env.d.ts`
- ✅ Copy entire file
- ⚠️ Update environment variable types if needed

---

#### Context Files

**File:** `src/contexts/SimpleAuthContext.tsx`
- ✅ Copy file
- ⚠️ Rename if needed
- ⚠️ Adjust role types
- ⚠️ Modify auth logic if using different system

---

#### Component Files

**File:** `src/components/ProtectedRoute.tsx`
- ✅ Copy entire file
- ✅ Works with any auth context (just update import)
- ⚠️ Update import path if context name changed

**File:** `src/components/Layout.tsx`
- ✅ Copy file
- ⚠️ Update navigation items
- ⚠️ Update logo/branding
- ⚠️ Adjust role checks

---

#### Library Files

**File:** `src/lib/firebase.ts`
- ✅ Copy entire file
- ⚠️ Update environment variable names if different
- ✅ Keep structure, just update config

**File:** `src/lib/submissions.ts` (or your service name)
- ✅ Copy file as template
- ⚠️ Rename to your service name
- ⚠️ Update collection names
- ⚠️ Adjust data structure
- ✅ Keep the patterns (upload, CRUD, subscriptions)

---

#### Type Files

**File:** `src/types/index.ts`
- ✅ Copy file as template
- ⚠️ Update types for your data model
- ✅ Keep the structure pattern

---

## 📦 Complete Copy Command

### For Linux/Mac Terminal

```bash
# Navigate to your new project
cd /path/to/new-project

# Copy configuration files
cp /path/to/issue-tracker/vite.config.ts .
cp /path/to/issue-tracker/tsconfig.json .
cp /path/to/issue-tracker/tsconfig.node.json .
cp /path/to/issue-tracker/tailwind.config.js .
cp /path/to/issue-tracker/postcss.config.js .
cp /path/to/issue-tracker/.env.example .
cp /path/to/issue-tracker/.gitignore .
cp /path/to/issue-tracker/firebase.json .
cp /path/to/issue-tracker/firestore.rules .
cp /path/to/issue-tracker/storage.rules .
cp /path/to/issue-tracker/firestore.indexes.json .
cp /path/to/issue-tracker/index.html .

# Copy source folder structure
cp -r /path/to/issue-tracker/src/contexts ./src/
cp -r /path/to/issue-tracker/src/components ./src/
cp -r /path/to/issue-tracker/src/lib ./src/
cp -r /path/to/issue-tracker/src/types ./src/

# Copy core source files
cp /path/to/issue-tracker/src/main.tsx ./src/
cp /path/to/issue-tracker/src/App.tsx ./src/
cp /path/to/issue-tracker/src/index.css ./src/
cp /path/to/issue-tracker/src/vite-env.d.ts ./src/
```

### For Windows PowerShell

```powershell
# Navigate to your new project
cd C:\path\to\new-project

# Copy configuration files
Copy-Item "C:\path\to\issue-tracker\vite.config.ts" -Destination .
Copy-Item "C:\path\to\issue-tracker\tsconfig.json" -Destination .
Copy-Item "C:\path\to\issue-tracker\tsconfig.node.json" -Destination .
Copy-Item "C:\path\to\issue-tracker\tailwind.config.js" -Destination .
Copy-Item "C:\path\to\issue-tracker\postcss.config.js" -Destination .
Copy-Item "C:\path\to\issue-tracker\.env.example" -Destination .
Copy-Item "C:\path\to\issue-tracker\.gitignore" -Destination .
Copy-Item "C:\path\to\issue-tracker\firebase.json" -Destination .
Copy-Item "C:\path\to\issue-tracker\firestore.rules" -Destination .
Copy-Item "C:\path\to\issue-tracker\storage.rules" -Destination .
Copy-Item "C:\path\to\issue-tracker\firestore.indexes.json" -Destination .
Copy-Item "C:\path\to\issue-tracker\index.html" -Destination .

# Copy source folders
Copy-Item "C:\path\to\issue-tracker\src\contexts" -Destination ".\src\" -Recurse
Copy-Item "C:\path\to\issue-tracker\src\components" -Destination ".\src\" -Recurse
Copy-Item "C:\path\to\issue-tracker\src\lib" -Destination ".\src\" -Recurse
Copy-Item "C:\path\to\issue-tracker\src\types" -Destination ".\src\" -Recurse

# Copy core source files
Copy-Item "C:\path\to\issue-tracker\src\main.tsx" -Destination ".\src\"
Copy-Item "C:\path\to\issue-tracker\src\App.tsx" -Destination ".\src\"
Copy-Item "C:\path\to\issue-tracker\src\index.css" -Destination ".\src\"
Copy-Item "C:\path\to\issue-tracker\src\vite-env.d.ts" -Destination ".\src\"
```

---

## 🎯 Minimal Copy (Just Patterns)

If you only want the optimization patterns:

### Must Copy Files:
```
✅ vite.config.ts          (code splitting config)
✅ tsconfig.json           (path aliases)
✅ tailwind.config.js      (if using Tailwind)
✅ postcss.config.js       (if using Tailwind)
✅ src/lib/firebase.ts     (Firebase init pattern)
```

### Optional Pattern Files:
```
⚠️ src/components/ProtectedRoute.tsx  (route protection pattern)
⚠️ src/lib/submissions.ts             (file upload pattern)
```

---

## 📝 After Copying - Update These

### 1. Update `vite.config.ts`
```typescript
manualChunks: {
  // Change these to YOUR dependencies
  your-library: ['your-library-name'],
  vendor: ['react', 'react-dom'],
}
```

### 2. Update `.env.example`
```env
# Change to YOUR Firebase project
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_project
```

### 3. Update `src/lib/firebase.ts`
```typescript
// Update environment variable names if different
apiKey: import.meta.env.VITE_YOUR_API_KEY,
```

### 4. Update `package.json`
```json
{
  "name": "your-project-name",
  "dependencies": {
    // Add YOUR dependencies
  }
}
```

### 5. Update `firebase.json`
```json
{
  "project": "your-firebase-project-id"
}
```

---

## ✅ Verification Checklist

After copying, verify:

- [ ] All config files copied
- [ ] Source folder structure created
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set up (`.env` file)
- [ ] Firebase project configured
- [ ] Build works (`npm run build`)
- [ ] Dev server runs (`npm run dev`)

---

## 🚀 Quick Start After Copy

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env with your Firebase config

# 3. Test build
npm run build

# 4. Run dev server
npm run dev

# 5. Deploy Firebase rules (if using Firebase)
firebase deploy --only firestore:rules,storage
```

---

## 📂 Complete Folder Structure to Copy

```
issue-tracker/
├── 📄 vite.config.ts                    ✅ COPY
├── 📄 tsconfig.json                      ✅ COPY
├── 📄 tsconfig.node.json                 ✅ COPY
├── 📄 tailwind.config.js                 ✅ COPY
├── 📄 postcss.config.js                  ✅ COPY
├── 📄 package.json                       ✅ COPY (scripts + devDeps)
├── 📄 .env.example                       ✅ COPY
├── 📄 .gitignore                         ✅ COPY
├── 📄 firebase.json                      ✅ COPY
├── 📄 firestore.rules                    ✅ COPY
├── 📄 storage.rules                      ✅ COPY
├── 📄 firestore.indexes.json             ✅ COPY
├── 📄 index.html                         ✅ COPY
└── 📁 src/
    ├── 📄 main.tsx                       ✅ COPY
    ├── 📄 App.tsx                        ✅ COPY (adapt routes)
    ├── 📄 index.css                      ✅ COPY
    ├── 📄 vite-env.d.ts                  ✅ COPY
    ├── 📁 contexts/
    │   └── 📄 SimpleAuthContext.tsx      ✅ COPY (adapt auth)
    ├── 📁 components/
    │   ├── 📄 Layout.tsx                 ✅ COPY (adapt nav)
    │   └── 📄 ProtectedRoute.tsx        ✅ COPY
    ├── 📁 lib/
    │   ├── 📄 firebase.ts                ✅ COPY (update config)
    │   └── 📄 submissions.ts             ✅ COPY (use as template)
    └── 📁 types/
        └── 📄 index.ts                   ✅ COPY (adapt types)
```

---

## 🎨 Visual Copy Map

```
FROM: issue-tracker/                    TO: your-new-project/
│                                         │
├── vite.config.ts ────────────────────► ├── vite.config.ts
├── tsconfig.json ──────────────────────► ├── tsconfig.json
├── tailwind.config.js ──────────────────► ├── tailwind.config.js
├── package.json ───────────────────────► ├── package.json
├── .env.example ───────────────────────► ├── .env.example
├── firebase.json ───────────────────────► ├── firebase.json
├── firestore.rules ─────────────────────► ├── firestore.rules
├── storage.rules ───────────────────────► ├── storage.rules
└── src/                                  └── src/
    ├── main.tsx ────────────────────────►     ├── main.tsx
    ├── App.tsx ──────────────────────────►     ├── App.tsx
    ├── index.css ────────────────────────►     ├── index.css
    ├── contexts/ ────────────────────────►     ├── contexts/
    ├── components/ ──────────────────────►     ├── components/
    ├── lib/ ────────────────────────────►     ├── lib/
    └── types/ ──────────────────────────►     └── types/
```

---

This guide shows exactly which files to copy. Follow the checklist above!
