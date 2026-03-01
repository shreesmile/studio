'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating an AI-powered performance overview.
 *
 * - generatePerformanceInsight - A function that generates a concise summary and key insights on team or overall system performance.
 * - GeneratePerformanceInsightInput - The input type for the generatePerformanceInsight function.
 * - GeneratePerformanceInsightOutput - The return type for the generatePerformanceInsight function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TaskSchema = z.object({
  id: z.string().describe('Unique identifier for the task.'),
  title: z.string().describe('Title of the task.'),
  description: z.string().optional().describe('Description of the task.'),
  assignedToUserId: z.string().describe('ID of the user assigned to the task.'),
  assignedByUserId: z.string().optional().describe('ID of the user who assigned the task.'),
  status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).describe('Current status of the task.'),
  deadline: z.string().optional().describe('Optional deadline for the task in ISO 8601 format.'),
  completedAt: z.string().optional().describe('Optional timestamp when the task was completed in ISO 8601 format.'),
  createdAt: z.string().describe('Timestamp when the task was created in ISO 8601 format.')
});

const UserSchema = z.object({
  id: z.string().describe('Unique identifier for the user.'),
  name: z.string().describe('Full name of the user.'),
  role: z.enum(['Super Admin', 'Admin', 'Manager', 'Team Lead', 'Employee']).describe('Role of the user in the system.'),
  department: z.string().optional().describe('Optional department the user belongs to.')
});

const GeneratePerformanceInsightInputSchema = z.object({
  tasks: z.array(TaskSchema).describe('An array of task objects with their details.'),
  users: z.array(UserSchema).describe('An array of user objects with their roles and names.'),
  context: z.string().optional().describe('Additional context or specific areas to focus on for the performance insight, e.g., "focus on overdue tasks" or "analyze team performance for the marketing department."')
});
export type GeneratePerformanceInsightInput = z.infer<typeof GeneratePerformanceInsightInputSchema>;

const GeneratePerformanceInsightOutputSchema = z.object({
  summary: z.string().describe('A concise overview of the overall team or system performance.'),
  keyInsights: z.array(z.string()).describe('A list of bullet points detailing key findings, trends, and actionable insights.'),
  identifiedTrends: z.array(z.string()).optional().describe('Optional identified performance trends or patterns.'),
  potentialBottlenecks: z.array(z.string()).optional().describe('Optional identified potential bottlenecks in workflow or resource allocation.')
});
export type GeneratePerformanceInsightOutput = z.infer<typeof GeneratePerformanceInsightOutputSchema>;

export async function generatePerformanceInsight(input: GeneratePerformanceInsightInput): Promise<GeneratePerformanceInsightOutput> {
  return generatePerformanceInsightFlow(input);
}

const performanceInsightPrompt = ai.definePrompt({
  name: 'performanceInsightPrompt',
  input: { schema: GeneratePerformanceInsightInputSchema },
  output: { schema: GeneratePerformanceInsightOutputSchema },
  prompt: `You are an AI-powered performance analyst. Your goal is to provide a concise summary and key insights on team or system performance based on the provided task and user data. Think step by step to identify trends, high/low performers, bottlenecks, and overall efficiency.

### Instructions:
1.  Analyze the provided 'tasks' and 'users' data.
2.  Generate a 'summary' that gives an overall picture of the performance.
3.  Identify 'keyInsights' as a list of actionable bullet points, highlighting significant findings, positive/negative trends, and areas for improvement.
4.  Optionally, identify 'identifiedTrends' and 'potentialBottlenecks' for more specific analysis.

### Current Date:
{{CURRENT_DATE}}

### Additional Context:
{{#if context}}
{{{context}}}
{{else}}
No specific context provided. Provide a general performance overview.
{{/if}}

### Provided Data:

#### Users:
{{#if users}}
{{#each users}}
- ID: {{{this.id}}}, Name: {{{this.name}}}, Role: {{{this.role}}}{{#if this.department}}, Department: {{{this.department}}}{{/if}}
{{/each}}
{{else}}
No user data provided.
{{/if}}

#### Tasks:
{{#if tasks}}
{{#each tasks}}
- ID: {{{this.id}}}, Title: {{{this.title}}}, AssignedTo: {{{this.assignedToUserId}}}, Status: {{{this.status}}}{{#if this.deadline}}, Deadline: {{{this.deadline}}}{{/if}}{{#if this.completedAt}}, CompletedAt: {{{this.completedAt}}}{{/if}}
{{/each}}
{{else}}
No task data provided.
{{/if}}

`,
});

const generatePerformanceInsightFlow = ai.defineFlow(
  {
    name: 'generatePerformanceInsightFlow',
    inputSchema: GeneratePerformanceInsightInputSchema,
    outputSchema: GeneratePerformanceInsightOutputSchema,
  },
  async (input) => {
    const { output } = await performanceInsightPrompt({
      ...input,
      CURRENT_DATE: new Date().toISOString(),
    });
    return output!;
  }
);
