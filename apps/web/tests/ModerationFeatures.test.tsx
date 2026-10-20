import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportFeedbackModal } from '../src/components/ReportFeedbackModal';
import { AdminModerationQueue } from '../src/components/AdminModerationQueue';
import { StudentAnalyticsDashboard } from '../src/components/StudentAnalyticsDashboard';
import { ReportReason, ReportStatus, ModerationResolutionAction } from '@peerspace/shared';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('Milestone 1: Feedback Flagging & Moderation (Frontend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 0 }),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    });
  });

  describe('1. ReportFeedbackModal Component', () => {
    it('renders report form with reason categories and submits confidential report', async () => {
      let reportPayload: any = null;

      vi.spyOn(global, 'fetch').mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString();

          if (url.includes('/api/feedback/reports') && init?.method === 'POST') {
            reportPayload = JSON.parse(init.body as string);
            return new Response(
              JSON.stringify({
                success: true,
                message: 'Report submitted successfully.',
                data: { id: 'report_123' },
              }),
              { status: 201 }
            );
          }

          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        }
      );

      const queryClient = createTestQueryClient();
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <ReportFeedbackModal
            submissionId="sub_1"
            questionId="q_code_review"
            questionTitle="Code Quality & Architecture"
            commentText="This work is completely unacceptable and awful."
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </QueryClientProvider>
      );

      expect(screen.getByText('Report Inappropriate Feedback')).toBeInTheDocument();
      expect(
        screen.getByText(/"This work is completely unacceptable and awful."/)
      ).toBeInTheDocument();

      // Reason selection
      const reasonSelect = screen.getByLabelText(/Reason for Report/i);
      fireEvent.change(reasonSelect, { target: { value: ReportReason.HARASSMENT } });

      // Explanation input
      const explanationInput = screen.getByLabelText(/Additional Explanation/i);
      fireEvent.change(explanationInput, {
        target: {
          value: 'This comment crosses into personal harassment rather than constructive feedback.',
        },
      });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(reportPayload).toEqual({
          submissionId: 'sub_1',
          questionId: 'q_code_review',
          reason: ReportReason.HARASSMENT,
          explanation:
            'This comment crosses into personal harassment rather than constructive feedback.',
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('displays error message when reporting fails', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString();

          if (url.includes('/api/feedback/reports') && init?.method === 'POST') {
            return new Response(
              JSON.stringify({
                success: false,
                error: { message: 'You have already reported this feedback comment.' },
              }),
              { status: 409 }
            );
          }

          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        }
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <ReportFeedbackModal
            submissionId="sub_1"
            questionId="q_code_review"
            questionTitle="Code Quality"
            commentText="Some comment"
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </QueryClientProvider>
      );

      const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText('You have already reported this feedback comment.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('2. AdminModerationQueue Component', () => {
    const mockReports = [
      {
        id: 'rep_1',
        submissionId: 'sub_1',
        roundId: 'round_1',
        roundTitle: 'Sprint 1 Peer Review',
        questionId: 'q_code_quality',
        questionTitle: 'Code Quality and Architecture',
        reportedComment: 'Terrible code, do not know why you are in this course.',
        reason: ReportReason.HARASSMENT,
        explanation: 'Very hostile and unconstructive feedback.',
        status: ReportStatus.PENDING,
        reporterId: 'user_student_1',
        reporterName: 'Target Student',
        reporterEmail: 'student@university.edu',
        isCommentHidden: false,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      },
    ];

    it('renders reports list preserving reviewer anonymity', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/admin/moderation/reports')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                items: mockReports,
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
                pendingCount: 1,
              },
            }),
            { status: 200 }
          );
        }

        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AdminModerationQueue />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sprint 1 Peer Review/)).toBeInTheDocument();
        expect(screen.getByText(/Code Quality and Architecture/)).toBeInTheDocument();
        expect(
          screen.getByText(/"Terrible code, do not know why you are in this course."/)
        ).toBeInTheDocument();
        expect(screen.getByText(/Target Student/)).toBeInTheDocument();
      });

      // Crucial privacy rule: reviewer name or identity must NOT be displayed
      expect(screen.queryByText(/Reviewer:/i)).not.toBeInTheDocument();
    });

    it('allows an admin to hide a reported comment with resolution notes', async () => {
      let resolutionPayload: any = null;

      vi.spyOn(global, 'fetch').mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString();

          if (url.includes('/api/admin/moderation/reports') && !url.includes('/resolve')) {
            return new Response(
              JSON.stringify({
                success: true,
                data: {
                  items: mockReports,
                  total: 1,
                  page: 1,
                  limit: 20,
                  totalPages: 1,
                  pendingCount: 1,
                },
              }),
              { status: 200 }
            );
          }

          if (url.includes('/resolve') && init?.method === 'POST') {
            resolutionPayload = JSON.parse(init.body as string);
            return new Response(
              JSON.stringify({
                success: true,
                message: 'Report resolved successfully.',
                data: {
                  id: 'rep_1',
                  status: ReportStatus.RESOLVED,
                  actionTaken: ModerationResolutionAction.HIDE_COMMENT,
                },
              }),
              { status: 200 }
            );
          }

          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        }
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AdminModerationQueue />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sprint 1 Peer Review/)).toBeInTheDocument();
      });

      // Click "Hide Comment"
      const hideBtn = screen.getByRole('button', { name: /Hide Comment/i });
      fireEvent.click(hideBtn);

      // Confirm modal opens
      expect(screen.getByText(/Hide Inappropriate Comment/i)).toBeInTheDocument();

      // Enter moderation note
      const noteInput = screen.getByLabelText(/Resolution Note/i);
      fireEvent.change(noteInput, {
        target: { value: 'Violation of student conduct policy.' },
      });

      // Confirm resolution
      const confirmBtn = screen.getByRole('button', { name: /Confirm Action/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(resolutionPayload).toEqual({
          action: ModerationResolutionAction.HIDE_COMMENT,
          note: 'Violation of student conduct policy.',
        });
      });
    });
  });

  describe('3. StudentAnalyticsDashboard Moderation Display', () => {
    it('redacts hidden comments with notice and disables report action', async () => {
      const mockAnalytics = {
        totalEvaluationsReceived: 2,
        studentAverageScore: 4.5,
        cohortAverageScore: 4.1,
        competencies: [],
        ratingDistribution: [],
        timeline: [],
      };

      const mockReceivedFeedback = [
        {
          id: 'sub_1',
          roundId: 'r1',
          roundTitle: 'Sprint 1 Peer Review',
          reviewerDisplayName: 'Anonymous Peer',
          isAnonymous: true,
          submittedAt: '2026-10-15T12:00:00.000Z',
          responses: [
            {
              questionId: 'q_comm',
              title: 'Communication Clarity',
              rating: 5,
              comment: 'Very helpful and collaborative.',
              isCommentHidden: false,
            },
            {
              questionId: 'q_code',
              title: 'Code Quality',
              rating: 4,
              comment: '[Feedback comment hidden by moderator for policy violation]',
              isCommentHidden: true,
            },
          ],
        },
      ];

      vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/feedback/analytics')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: mockAnalytics,
            }),
            { status: 200 }
          );
        }

        if (url.includes('/api/feedback/received')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: mockReceivedFeedback,
            }),
            { status: 200 }
          );
        }

        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <StudentAnalyticsDashboard />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('"Very helpful and collaborative."')).toBeInTheDocument();
        expect(
          screen.getByText('[Feedback comment hidden by moderator for policy violation]')
        ).toBeInTheDocument();
      });

      // Exactly 1 report button for the visible comment (none for hidden)
      const reportButtons = screen.getAllByRole('button', { name: /Report/i });
      expect(reportButtons.length).toBe(1);
    });
  });
});
