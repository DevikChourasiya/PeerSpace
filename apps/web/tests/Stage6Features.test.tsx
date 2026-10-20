import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentEvaluationModal } from '../src/components/StudentEvaluationModal';
import { StudentAnalyticsDashboard } from '../src/components/StudentAnalyticsDashboard';
import { AdminAuditLogs } from '../src/components/AdminAuditLogs';
import { StudentRoundsList } from '../src/components/StudentRoundsList';
import { QuestionType } from '@peerspace/shared';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('Stage 6: Student Feedback Submissions, Analytics & Audit Logs (Frontend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock HTML5 Canvas for Chart.js in JSDOM
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

  describe('1. StudentEvaluationModal Component', () => {
    it('renders questions, supports rating changes, and allows saving a draft', async () => {
      let draftPayload: any = null;

      vi.spyOn(global, 'fetch').mockImplementation(
        (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : input.toString();

          if (
            url.includes('/api/rounds/rubrics/versions/qv_1') ||
            url.includes('/api/admin/questionnaires/q_1/versions/qv_1')
          ) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  version: {
                    id: 'qv_1',
                    questionnaireId: 'q_1',
                    versionNumber: 1,
                    title: 'Engineering Evaluation Rubric',
                    questions: [
                      {
                        id: 'q_1',
                        order: 0,
                        title: 'Collaboration Ability',
                        type: QuestionType.STAR_RATING,
                        required: true,
                        scaleMax: 5,
                      },
                      {
                        id: 'q_2',
                        order: 1,
                        title: 'Constructive Comments',
                        type: QuestionType.LONG_TEXT,
                        required: false,
                      },
                    ],
                  },
                }),
                { status: 200 }
              )
            );
          }

          if (url.includes('/api/rounds/round_1/peers')) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: {
                    roundId: 'round_1',
                    roundTitle: 'Sprint 1 Feedback',
                    submissionsPerPeer: 2,
                    submittedCount: 0,
                    candidates: [
                      {
                        id: 'peer_1',
                        name: 'Taylor Swift',
                        department: 'Engineering',
                        classSection: 'CS-401',
                        submissionStatus: 'not_started',
                      },
                    ],
                  },
                }),
                { status: 200 }
              )
            );
          }

          if (url.includes('/api/rounds/round_1/submissions/peer/peer_1')) {
            return Promise.resolve(
              new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
            );
          }

          if (url.includes('/api/rounds/round_1/submissions/draft')) {
            draftPayload = JSON.parse(init?.body as string);
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  message: 'Draft saved successfully.',
                  data: { id: 'sub_draft_1', status: 'draft' },
                }),
                { status: 200 }
              )
            );
          }

          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
      );

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <StudentEvaluationModal
            roundId="round_1"
            roundTitle="Sprint 1 Feedback"
            questionnaireId="q_1"
            questionnaireVersionId="qv_1"
            allowSubmissionEdit={true}
            peer={{
              id: 'peer_1',
              name: 'Taylor Swift',
              department: 'Engineering',
              classSection: 'CS-401',
              submissionStatus: 'not_started',
            }}
            onClose={vi.fn()}
          />
        </QueryClientProvider>
      );

      // Verify modal header renders target peer name
      expect(await screen.findByText(/Evaluating: Taylor Swift/i)).toBeInTheDocument();
      expect(await screen.findByText(/Collaboration Ability/i)).toBeInTheDocument();

      // Rate 5 stars
      const starButton = screen.getByLabelText(/Rate 5 out of 5 stars/i);
      fireEvent.click(starButton);

      // Save Draft
      const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i });
      fireEvent.click(saveDraftButton);

      await waitFor(() => {
        expect(draftPayload).not.toBeNull();
        expect(draftPayload.targetStudentId).toBe('peer_1');
        expect(draftPayload.responses[0].rating).toBe(5);
      });
    });
  });

  describe('2. StudentAnalyticsDashboard Component', () => {
    it('renders competency radar chart canvas, metrics overview, and constructive feedback list', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/feedback/analytics')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  totalEvaluationsReceived: 3,
                  overallAverageScore: 4.8,
                  cohortAverageScore: 4.2,
                  competencies: [
                    {
                      category: 'Technical Rigor',
                      studentAverage: 4.9,
                      cohortAverage: 4.1,
                      evaluationsCount: 3,
                    },
                    {
                      category: 'Collaboration',
                      studentAverage: 4.7,
                      cohortAverage: 4.3,
                      evaluationsCount: 3,
                    },
                  ],
                  ratingDistribution: [
                    { rating: 1, count: 0 },
                    { rating: 2, count: 0 },
                    { rating: 3, count: 0 },
                    { rating: 4, count: 1 },
                    { rating: 5, count: 2 },
                  ],
                  timeline: [
                    {
                      roundId: 'r1',
                      roundTitle: 'Midterm',
                      date: '2026-10-15',
                      averageScore: 4.8,
                      evaluationsCount: 3,
                    },
                  ],
                },
              }),
              { status: 200 }
            )
          );
        }

        if (url.includes('/api/feedback/received')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: [
                  {
                    id: 'sub_rec_1',
                    roundId: 'r1',
                    roundTitle: 'Midterm Evaluation',
                    reviewerDisplayName: 'Anonymous Peer',
                    isAnonymous: true,
                    submittedAt: new Date().toISOString(),
                    responses: [
                      {
                        questionId: 'q1',
                        title: 'Teamwork',
                        category: 'Collaboration',
                        questionType: QuestionType.STAR_RATING,
                        rating: 5,
                        comment: 'Outstanding support across the entire team project.',
                      },
                    ],
                  },
                ],
              }),
              { status: 200 }
            )
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <StudentAnalyticsDashboard />
        </QueryClientProvider>
      );

      // Verify KPI metrics
      expect(await screen.findByText('3')).toBeInTheDocument(); // total evaluations
      expect(screen.getByText('4.8')).toBeInTheDocument(); // your score
      expect(screen.getByText('4.2')).toBeInTheDocument(); // cohort score

      // Verify Chart canvases are present in DOM
      expect(screen.getByTestId('competency-radar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('rating-bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('longitudinal-line-chart')).toBeInTheDocument();

      // Verify received feedback list and anonymity badge
      expect(screen.getByText('Anonymous Peer')).toBeInTheDocument();
      expect(
        screen.getByText(/"Outstanding support across the entire team project\."/i)
      ).toBeInTheDocument();
    });
  });

  describe('3. AdminAuditLogs Component', () => {
    it('renders audit entries, actor emails, action badges, and change details', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/admin/audit-logs')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  items: [
                    {
                      id: 'audit_1',
                      actorId: 'admin_1',
                      actorEmail: 'admin@university.edu',
                      actorRole: 'admin',
                      action: 'MEMBERSHIP_APPROVED',
                      entityType: 'User',
                      entityId: 'stu_123456',
                      details: { studentEmail: 'student@university.edu' },
                      ip: '127.0.0.1',
                      createdAt: new Date().toISOString(),
                    },
                  ],
                  total: 1,
                  page: 1,
                  limit: 20,
                  totalPages: 1,
                },
              }),
              { status: 200 }
            )
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AdminAuditLogs />
        </QueryClientProvider>
      );

      expect(await screen.findByText('admin@university.edu')).toBeInTheDocument();
      expect(screen.getByText('MEMBERSHIP_APPROVED')).toBeInTheDocument();
      expect(screen.getByText(/123456/i)).toBeInTheDocument();
    });
  });

  describe('4. StudentRoundsList Peer Evaluation Flow', () => {
    it('displays "Evaluate Peers" for open round and launches peer selection', async () => {
      vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/rounds/round_active/peers')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  roundId: 'round_active',
                  roundTitle: 'Active Sprint 1',
                  submissionsPerPeer: 2,
                  submittedCount: 0,
                  candidates: [
                    {
                      id: 'peer_candidate_1',
                      name: 'Jordan Smith',
                      department: 'Computer Science',
                      classSection: 'CS-401',
                      submissionStatus: 'not_started',
                    },
                  ],
                },
              }),
              { status: 200 }
            )
          );
        }

        if (url.includes('/api/rounds')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                rounds: [
                  {
                    id: 'round_active',
                    title: 'Active Sprint 1',
                    status: 'open',
                    startDate: new Date(Date.now() - 100000).toISOString(),
                    deadline: new Date(Date.now() + 1000000).toISOString(),
                    isAnonymous: true,
                    allowSubmissionEdit: true,
                    submissionsPerPeer: 2,
                    feedbackVisibility: 'after_deadline',
                    targetClass: 'CS-401',
                    questionnaireTitle: 'Peer Rubric',
                    questionCount: 3,
                  },
                ],
              }),
              { status: 200 }
            )
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <StudentRoundsList />
        </QueryClientProvider>
      );

      // Verify active round is rendered with "Evaluate Peers" button
      const evaluateButton = await screen.findByRole('button', {
        name: /Evaluate peers for Active Sprint 1/i,
      });
      expect(evaluateButton).toBeInTheDocument();

      // Click "Evaluate Peers"
      fireEvent.click(evaluateButton);

      // Verify Peer Candidate Selector modal appears
      expect(await screen.findByText(/Select a Peer to Evaluate/i)).toBeInTheDocument();
      expect(await screen.findByText('Jordan Smith')).toBeInTheDocument();
    });
  });
});
