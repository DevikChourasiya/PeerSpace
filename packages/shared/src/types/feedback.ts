export enum QuestionType {
  STAR_RATING = 'star_rating',
  NUMERIC_RATING = 'numeric_rating',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  YES_NO = 'yes_no',
  SHORT_TEXT = 'short_text',
  LONG_TEXT = 'long_text',
  CATEGORY_BASED = 'category_based',
}

export enum QuestionnaireStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum RoundStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum FeedbackVisibility {
  IMMEDIATE = 'immediate',
  AFTER_DEADLINE = 'after_deadline',
  INSTRUCTOR_RELEASED = 'instructor_released',
}
