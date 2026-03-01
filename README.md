# RoleFlow - Enterprise RBAC Platform

RoleFlow is a professional Role-Based Access Control (RBAC) management platform built with Next.js 15, Firebase, and GenAI insights.

## Features

- **Robust RBAC Hierarchy**: Strictly enforced roles (Super Admin, Admin, Manager, Team Lead, Employee).
- **Real-time Synchronization**: Powered by Firestore for instant data updates across the organization.
- **AI Performance Insights**: Leveraging Google Gemini to analyze team productivity and identify bottlenecks.
- **Secure Task Management**: Hierarchical task assignment and tracking system.
- **User Directory**: Full CRUD capabilities for administrators with secure password visibility controls.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Firebase (Firestore & Authentication)
- **Styling**: Tailwind CSS & ShadCN UI
- **AI**: Genkit with Google AI (Gemini 2.5 Flash)
- **State Management**: Zustand (with Persistence)

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shreesmile/RoleFlow.git
   cd RoleFlow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase**:
   Update `src/firebase/config.ts` with your Firebase project credentials.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## Security Rules

The application uses existence-based role checks (DBAC) for maximum security and efficiency. Ensure you deploy the security rules found in `firestore.rules` to your Firebase project.

---
Built with ❤️ in Firebase Studio.