# RoleFlow - Enterprise RBAC Platform

RoleFlow is a professional Role-Based Access Control (RBAC) management platform built with a modern enterprise stack.

## Features

- **Robust RBAC Hierarchy**: Strictly enforced roles (Super Admin, Admin, Manager, Team Lead, Employee).
- **Real-time Synchronization**: Powered by Firestore for instant data updates across the organization.
- **AI Performance Insights**: Leveraging Google Gemini to analyze team productivity and identify bottlenecks.
- **Secure Task Management**: Hierarchical task assignment and tracking system.
- **User Directory**: Full CRUD capabilities for administrators with clear password visibility controls.

## Tech Stack & Languages

This application utilizes the following technologies:

- **Node.js**: The underlying runtime environment for server-side execution.
- **Next.js 15**: The React framework used for both frontend and backend (API routes/Node.js logic).
- **React 19**: For building high-performance, interactive UI components.
- **Tailwind CSS**: For professional, responsive styling and utility-first design.
- **Genkit & Handlebars**: Handlebars is used for templating sophisticated AI prompts within the Genkit engine.
- **Firebase (Firestore & Auth)**: Real-time database and secure enterprise authentication.
- **Configuration & Data**: **JSON** and **YAML** are used for data structures and environment configurations.
- **TypeScript**: The primary language ensuring code quality and type safety.

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

The application uses existence-based role checks (DBAC) and hierarchical data validation for maximum security. Security rules are written in a specialized DSL for Firestore.

---
Built with ❤️ in Firebase Studio.
