import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Copy,
  UploadCloud,
  Eye,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  QuestionType,
  QuestionnaireStatus,
  type Question,
  type QuestionnaireResponse,
} from '@peerspace/shared';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import { QuestionnairePreviewModal } from './QuestionnairePreviewModal';

export const QuestionnaireBuilder: React.FC = () => {
  const {
    questionnaires,
    questionnairesQuery,
    createMutation,
    updateMutation,
    duplicateMutation,
    publishMutation,
  } = useQuestionnaires();

  const [activeEditorQuestionnaire, setActiveEditorQuestionnaire] =
    useState<QuestionnaireResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editor form state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorCategory, setEditorCategory] = useState('General');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorQuestions, setEditorQuestions] = useState<Question[]>([]);

  // Preview state
  const [previewData, setPreviewData] = useState<{
    title: string;
    category: string;
    description?: string;
    versionNumber?: number;
    questions: Question[];
  } | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const openEditor = (q?: QuestionnaireResponse) => {
    setFeedback(null);
    setIsEditing(true);
    if (q) {
      setActiveEditorQuestionnaire(q);
      setEditorTitle(q.title);
      setEditorCategory(q.category);
      setEditorDescription(q.description || '');
      setEditorQuestions(q.questions || []);
    } else {
      // New questionnaire draft
      setActiveEditorQuestionnaire(null);
      setEditorTitle('');
      setEditorCategory('Peer Evaluation');
      setEditorDescription('');
      setEditorQuestions([
        {
          id: `q_${Date.now()}_1`,
          order: 1,
          title: 'Collaboration & Teamwork Contribution',
          description: 'Rate the teammate’s consistency in attending meetings and communicating.',
          type: QuestionType.STAR_RATING,
          required: true,
          scaleMin: 1,
          scaleMax: 5,
        },
      ]);
    }
  };

  const closeEditor = () => {
    setIsEditing(false);
    setActiveEditorQuestionnaire(null);
    setFeedback(null);
  };

  const handleAddQuestion = (type: QuestionType = QuestionType.STAR_RATING) => {
    const newQ: Question = {
      id: `q_${Date.now()}_${editorQuestions.length + 1}`,
      order: editorQuestions.length + 1,
      title: 'New Evaluation Metric',
      description: '',
      type,
      required: true,
      scaleMin: 1,
      scaleMax: 5,
      options:
        type === QuestionType.SINGLE_CHOICE ||
        type === QuestionType.MULTIPLE_CHOICE ||
        type === QuestionType.CATEGORY_BASED
          ? ['Option A', 'Option B']
          : undefined,
    };
    setEditorQuestions([...editorQuestions, newQ]);
  };

  const handleUpdateQuestion = (index: number, patch: Partial<Question>) => {
    const updated = [...editorQuestions];
    const target = updated[index];
    if (!target) return;

    updated[index] = { ...target, ...patch };
    setEditorQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const filtered = editorQuestions.filter((_, i) => i !== index);
    const reordered = filtered.map((q, idx) => ({ ...q, order: idx + 1 }));
    setEditorQuestions(reordered);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === editorQuestions.length - 1)
    ) {
      return;
    }

    const updated = [...editorQuestions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const currentQ = updated[index];
    const swapQ = updated[targetIdx];
    if (!currentQ || !swapQ) return;

    updated[index] = swapQ;
    updated[targetIdx] = currentQ;

    const reordered = updated.map((q, idx) => ({ ...q, order: idx + 1 }));
    setEditorQuestions(reordered);
  };

  const handleAddOption = (questionIndex: number) => {
    const q = editorQuestions[questionIndex];
    if (!q) return;

    const currentOptions = q.options || [];
    const newOptions = [
      ...currentOptions,
      `Option ${String.fromCharCode(65 + currentOptions.length)}`,
    ];
    handleUpdateQuestion(questionIndex, { options: newOptions });
  };

  const handleUpdateOption = (questionIndex: number, optionIndex: number, val: string) => {
    const q = editorQuestions[questionIndex];
    if (!q) return;

    const currentOptions = [...(q.options || [])];
    currentOptions[optionIndex] = val;
    handleUpdateQuestion(questionIndex, { options: currentOptions });
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const q = editorQuestions[questionIndex];
    if (!q) return;

    const currentOptions = (q.options || []).filter((_, i) => i !== optionIndex);
    handleUpdateQuestion(questionIndex, { options: currentOptions });
  };

  const handleSaveDraft = async () => {
    setFeedback(null);
    if (!editorTitle.trim()) {
      setFeedback({ type: 'error', message: 'Questionnaire title cannot be empty.' });
      return;
    }

    try {
      if (activeEditorQuestionnaire) {
        await updateMutation.mutateAsync({
          id: activeEditorQuestionnaire.id,
          payload: {
            title: editorTitle,
            category: editorCategory,
            description: editorDescription,
            questions: editorQuestions,
          },
        });
        setFeedback({
          type: 'success',
          message: 'Questionnaire draft saved successfully.',
        });
      } else {
        const created = await createMutation.mutateAsync({
          title: editorTitle,
          category: editorCategory,
          description: editorDescription,
          questions: editorQuestions,
        });
        setActiveEditorQuestionnaire(created.questionnaire);
        setFeedback({
          type: 'success',
          message: 'New questionnaire draft created successfully.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save questionnaire draft.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handlePublish = async (id: string) => {
    setFeedback(null);
    try {
      const res = await publishMutation.mutateAsync(id);
      setFeedback({
        type: 'success',
        message: `Version v${res.publishedVersion.versionNumber} published successfully and is now immutable.`,
      });
      if (activeEditorQuestionnaire?.id === id) {
        setActiveEditorQuestionnaire(res.questionnaire);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish questionnaire.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleDuplicate = async (id: string) => {
    setFeedback(null);
    try {
      await duplicateMutation.mutateAsync(id);
      setFeedback({
        type: 'success',
        message: 'Questionnaire duplicated as a new draft.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to duplicate questionnaire.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  // If in editor view, render questionnaire editor form
  if (isEditing) {
    return (
      <div className="space-y-6">
        {/* Editor Top Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeEditor}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Return to questionnaire list"
            >
              <X className="h-4 w-4" />
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                {activeEditorQuestionnaire ? 'Edit Questionnaire Draft' : 'New Questionnaire Draft'}
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {editorTitle || 'Untitled Questionnaire'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPreviewData({
                  title: editorTitle || 'Questionnaire Preview',
                  category: editorCategory,
                  description: editorDescription,
                  versionNumber: activeEditorQuestionnaire?.currentVersion,
                  questions: editorQuestions,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={updateMutation.isPending || createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <span>
                {updateMutation.isPending || createMutation.isPending ? 'Saving...' : 'Save Draft'}
              </span>
            </button>

            {activeEditorQuestionnaire && (
              <button
                type="button"
                onClick={() => handlePublish(activeEditorQuestionnaire.id)}
                disabled={publishMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>{publishMutation.isPending ? 'Publishing...' : 'Publish Version'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded p-1 hover:bg-black/5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Metadata Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label
                htmlFor="questionnaire-title-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Questionnaire Title
              </label>
              <input
                id="questionnaire-title-input"
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="e.g. Capstone Peer Rubric 2026"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="questionnaire-category-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Category
              </label>
              <input
                id="questionnaire-category-input"
                type="text"
                value={editorCategory}
                onChange={(e) => setEditorCategory(e.target.value)}
                placeholder="e.g. Teamwork, Code Quality"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="questionnaire-desc-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
            >
              Description & Instructions (Optional)
            </label>
            <textarea
              id="questionnaire-desc-input"
              rows={2}
              value={editorDescription}
              onChange={(e) => setEditorDescription(e.target.value)}
              placeholder="Provide clear evaluation guidelines for students answering this rubric..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Questions List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Questionnaire Questions ({editorQuestions.length})
              </h3>
              <p className="text-xs text-slate-500">
                Configure question titles, types, response constraints, and display order.
              </p>
            </div>

            {/* Quick add question button */}
            <button
              type="button"
              onClick={() => handleAddQuestion(QuestionType.STAR_RATING)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          {editorQuestions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">Question Item</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(idx, 'down')}
                    disabled={idx === editorQuestions.length - 1}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(idx)}
                    className="p-1 rounded hover:bg-rose-50 text-rose-600 transition-colors ml-2"
                    title="Delete Question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label
                    htmlFor={`question-title-input-${idx}`}
                    className="block text-[11px] font-semibold text-slate-600"
                  >
                    Question Title / Prompt
                  </label>
                  <input
                    id={`question-title-input-${idx}`}
                    type="text"
                    value={q.title}
                    onChange={(e) => handleUpdateQuestion(idx, { title: e.target.value })}
                    placeholder="Enter question title..."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={`question-type-select-${idx}`}
                    className="block text-[11px] font-semibold text-slate-600"
                  >
                    Response Type
                  </label>
                  <select
                    id={`question-type-select-${idx}`}
                    value={q.type}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, {
                        type: e.target.value as QuestionType,
                        options:
                          e.target.value === QuestionType.SINGLE_CHOICE ||
                          e.target.value === QuestionType.MULTIPLE_CHOICE ||
                          e.target.value === QuestionType.CATEGORY_BASED
                            ? q.options && q.options.length >= 2
                              ? q.options
                              : ['Option A', 'Option B']
                            : undefined,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value={QuestionType.STAR_RATING}>Star Rating (1 - 5)</option>
                    <option value={QuestionType.NUMERIC_RATING}>Numeric Scale</option>
                    <option value={QuestionType.SINGLE_CHOICE}>Single Choice (Radio)</option>
                    <option value={QuestionType.MULTIPLE_CHOICE}>
                      Multiple Choice (Checkboxes)
                    </option>
                    <option value={QuestionType.YES_NO}>Yes / No Toggle</option>
                    <option value={QuestionType.SHORT_TEXT}>Short Text Answer</option>
                    <option value={QuestionType.LONG_TEXT}>Long Text Qualitative Feedback</option>
                    <option value={QuestionType.CATEGORY_BASED}>Category-Based Rubric</option>
                  </select>
                </div>
              </div>

              {/* Description & Required Checkbox */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input
                  type="text"
                  value={q.description || ''}
                  onChange={(e) => handleUpdateQuestion(idx, { description: e.target.value })}
                  placeholder="Optional helper text or scoring rubric guidance..."
                  className="w-full sm:w-2/3 rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => handleUpdateQuestion(idx, { required: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Required Question</span>
                </label>
              </div>

              {/* Dynamic options editor for choice questions */}
              {(q.type === QuestionType.SINGLE_CHOICE ||
                q.type === QuestionType.MULTIPLE_CHOICE ||
                q.type === QuestionType.CATEGORY_BASED) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">
                      Choice Options (Minimum 2)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddOption(idx)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                    >
                      + Add Option
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(q.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono w-4">
                          {optIdx + 1}.
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        {(q.options?.length || 0) > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx, optIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Remove Option"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add question bottom banner */}
          <button
            type="button"
            onClick={() => handleAddQuestion(QuestionType.STAR_RATING)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Another Evaluation Question</span>
          </button>
        </div>

        {/* Modal for preview */}
        {previewData && (
          <QuestionnairePreviewModal
            title={previewData.title}
            category={previewData.category}
            description={previewData.description}
            versionNumber={previewData.versionNumber}
            questions={previewData.questions}
            onClose={() => setPreviewData(null)}
          />
        )}
      </div>
    );
  }

  // Questionnaire List View
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Evaluation Questionnaires & Version Builder
              </h2>
              <p className="text-xs text-slate-500">
                Create structured rubrics, configure rating scales, and publish immutable versions.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openEditor()}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Questionnaire</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Questionnaire List */}
      {questionnairesQuery.isLoading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
          Loading questionnaire catalog...
        </div>
      ) : questionnaires.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <FileText className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No Questionnaires Built Yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by creating your first evaluation questionnaire rubric.
          </p>
          <button
            type="button"
            onClick={() => openEditor()}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Questionnaire</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questionnaires.map((q) => {
            const isPublished = q.status === QuestionnaireStatus.PUBLISHED;

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                        isPublished
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {q.status}
                    </span>

                    {q.currentVersion > 0 && (
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        v{q.currentVersion}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight">{q.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {q.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Category: {q.category}</span>
                    <span>{q.questions?.length || 0} Questions</span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewData({
                          title: q.title,
                          category: q.category,
                          description: q.description,
                          versionNumber: q.currentVersion,
                          questions: q.questions,
                        })
                      }
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Preview Questionnaire"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(q.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Duplicate Questionnaire"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditor(q)}
                      className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                    >
                      Edit Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePublish(q.id)}
                      disabled={publishMutation.isPending}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Publish
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <QuestionnairePreviewModal
          title={previewData.title}
          category={previewData.category}
          description={previewData.description}
          versionNumber={previewData.versionNumber}
          questions={previewData.questions}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
};
