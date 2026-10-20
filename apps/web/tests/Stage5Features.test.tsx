import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentDirectory } from '../src/components/StudentDirectory';
import { StudentRoundsList } from '../src/components/StudentRoundsList';
import { QuestionnaireBuilder } from '../src/components/QuestionnaireBuilder';
import { FeedbackRoundManager } from '../src/components/FeedbackRoundManager';
import {
  QuestionType,
  QuestionnaireStatus,
  RoundStatus,
  UserRole,
  UserStatus,
} from '@peerspace/shared';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('Stage 5: Frontend Directory, Questionnaire Builder & Feedback Rounds', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. StudentDirectory Component', () => {
    it('renders search input, student cards, and department information', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/students')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                students: [
                  {
                    id: 'stu_1',
                    name: 'Alex Rivera',
                    email: 'alex@university.edu',
                    role: UserRole.STUDENT,
                    status: UserStatus.ACTIVE,
                    department: 'Computer Science',
                    classSection: 'CS-401',
                    createdAt: new Date().toISOString(),
                  },
                ],
                total: 1,
                page: 1,
                limit: 12,
                totalPages: 1,
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <StudentDirectory />
        </QueryClientProvider>
      );

      expect(
        screen.getByPlaceholderText(/Search by name, email, department.../i)
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
        expect(screen.getByText('alex@university.edu')).toBeInTheDocument();
        expect(screen.getByText('CS-401')).toBeInTheDocument();
      });
    });

    it('displays empty state when no students match search', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/students')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                students: [],
                total: 0,
                page: 1,
                limit: 12,
                totalPages: 0,
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <StudentDirectory />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/No Classmates Found/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. StudentRoundsList Component', () => {
    it('renders scheduled feedback rounds with deadline and anonymity indicator', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/rounds')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                count: 1,
                rounds: [
                  {
                    id: 'round_1',
                    title: 'Midterm Peer Evaluation 2026',
                    description: 'Comprehensive evaluation of team contributions.',
                    status: 'open',
                    startDate: new Date().toISOString(),
                    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
                    isAnonymous: true,
                    allowSubmissionEdit: true,
                    submissionsPerPeer: 1,
                    feedbackVisibility: 'after_deadline',
                    targetClass: 'CS-401',
                    questionnaireTitle: 'Capstone Team Rubric',
                    questionCount: 4,
                  },
                ],
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <StudentRoundsList />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Midterm Peer Evaluation 2026')).toBeInTheDocument();
        expect(screen.getByText(/Anonymous Review/i)).toBeInTheDocument();
        expect(screen.getByText(/Capstone Team Rubric/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. QuestionnaireBuilder Component', () => {
    it('renders questionnaire catalog and opens editor for creating new questionnaires', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/admin/questionnaires')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                count: 1,
                questionnaires: [
                  {
                    id: 'q_1',
                    title: 'Sprint 1 Peer Review Rubric',
                    description: 'Evaluate code quality and sprint backlog execution.',
                    category: 'Software Engineering',
                    status: QuestionnaireStatus.PUBLISHED,
                    currentVersion: 1,
                    publishedVersionId: 'qv_1',
                    questions: [
                      {
                        id: 'q1',
                        order: 1,
                        title: 'Technical Quality',
                        type: QuestionType.STAR_RATING,
                        required: true,
                      },
                    ],
                    createdBy: 'admin_1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <QuestionnaireBuilder />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Sprint 1 Peer Review Rubric')).toBeInTheDocument();
        expect(screen.getByText('v1')).toBeInTheDocument();
      });

      // Click "New Questionnaire"
      fireEvent.click(screen.getByRole('button', { name: /New Questionnaire/i }));

      expect(screen.getByText('New Questionnaire Draft')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Capstone Peer Rubric 2026/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Draft/i })).toBeInTheDocument();
    });
  });

  describe('4. FeedbackRoundManager Component', () => {
    it('renders rounds table and allows admin to trigger status transitions', async () => {
      let transitionedToOpen = false;

      vi.spyOn(global, 'fetch').mockImplementation(
        (input: RequestInfo | URL, _init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString();
          if (url.includes('/api/admin/rounds/round_draft_1/status')) {
            transitionedToOpen = true;
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  message: 'Feedback round status updated to "open".',
                  round: {
                    id: 'round_draft_1',
                    title: 'Draft Sprint Round',
                    status: RoundStatus.OPEN,
                  },
                }),
                { status: 200 }
              )
            );
          }
          if (url.includes('/api/admin/rounds')) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  count: 1,
                  rounds: [
                    {
                      id: 'round_draft_1',
                      title: 'Draft Sprint Round',
                      status: RoundStatus.DRAFT,
                      questionnaireTitle: 'Code Review Rubric',
                      questionnaireVersionNumber: 1,
                      targetClass: 'CS-401',
                      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
                      isAnonymous: true,
                      allowSubmissionEdit: true,
                      submissionsPerPeer: 1,
                      feedbackVisibility: 'after_deadline',
                      eligibleStudentIds: [],
                      createdBy: 'admin_1',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                }),
                { status: 200 }
              )
            );
          }
          if (url.includes('/api/admin/questionnaires')) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  count: 0,
                  questionnaires: [],
                }),
                { status: 200 }
              )
            );
          }
          return Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
        }
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <FeedbackRoundManager />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Draft Sprint Round')).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Open feedback round Draft Sprint Round/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole('button', { name: /Open feedback round Draft Sprint Round/i })
      );

      await waitFor(() => {
        expect(transitionedToOpen).toBe(true);
      });
    });
  });
});
