export interface KnowledgeArea {
  id: number;
  description: string;
}
export interface Subject {
  id: number;
  description: string;
  knowledgeArea: KnowledgeArea;
}
export interface Topic {
  id: number;
  description: string;
  subject: Subject;
}
export interface EntranceExam {
  id: number;
  name: string;
  year: number;
  stage: string;
  institution: { id: number; name: string; acronym: string };
}
export interface Catalog {
  knowledgeAreas: KnowledgeArea[];
  subjects: Subject[];
  topics: Topic[];
  entranceExams: EntranceExam[];
}
export interface QuestionFilter {
  knowledgeAreaId?: number;
  subjectId?: number;
  topicId?: number;
  entranceExamId?: number;
  difficulty?: number;
}
export interface AnswerOption {
  id: number;
  letter: string;
  text: string;
}
export interface QuestionImage {
  id: number;
  url: string;
  subtitle: string | null;
}
export interface Question {
  id: number;
  statement: string;
  difficulty: number | null;
  entranceExam: EntranceExam | null;
  subject: Subject | null;
  topic: Topic | null;
  answerOptions: AnswerOption[];
  images: QuestionImage[];
}
export function questionSubject(question: Pick<Question, 'topic' | 'subject'>): Subject | null {
  return question.topic?.subject ?? question.subject;
}
