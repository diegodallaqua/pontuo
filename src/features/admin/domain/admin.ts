import {
  questionSubject,
  type AnswerOption,
  type EntranceExam,
  type Subject,
  type Topic,
} from '../../catalog/domain/catalog';

export interface State {
  id: number;
  name: string;
}
export interface City {
  id: number;
  name: string;
  state: State | null;
}
export interface Address {
  id: number;
  street: string;
  neighborhood: string;
  number: number;
  complement: string | null;
  city: City;
}
export interface Institution {
  id: number;
  name: string;
  acronym: string;
  address: Address;
}
// O catálogo do aluno usa só nome e sigla da instituição; a administração edita o endereço.
export interface AdminEntranceExam extends Omit<EntranceExam, 'institution'> {
  institution: Institution;
}
export interface AdminQuestion {
  id: number;
  statement: string;
  explanation: string | null;
  difficulty: number | null;
  createdAt: string;
  entranceExam: AdminEntranceExam;
  topic: Topic | null;
  subject: Subject | null;
}
export interface AnswerKeyOption extends AnswerOption {
  rightAnswer: boolean;
}

// Corpos aceitos pela API em POST e PUT.
export interface KnowledgeAreaInput {
  description: string;
}
export interface SubjectInput {
  description: string;
  knowledgeAreaId: number;
}
export interface TopicInput {
  description: string;
  subjectId: number;
}
export interface AddressInput {
  street: string;
  neighborhood: string;
  number: number;
  complement: string | null;
  cityId: number;
}
export interface InstitutionInput {
  name: string;
  acronym: string;
  addressId: number;
}
export interface EntranceExamInput {
  name: string;
  year: number;
  stage: string;
  institutionId: number;
}
export interface QuestionInput {
  statement: string;
  explanation: string | null;
  difficulty: number | null;
  entranceExamId: number;
  topicId: number | null;
  subjectId: number | null;
}
export interface AnswerOptionInput {
  questionId: number;
  letter: string;
  text: string;
  rightAnswer: boolean;
}
export interface QuestionImageInput {
  questionId: number;
  url: string;
  subtitle: string | null;
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function freeLetters(options: AnswerOption[], current: AnswerOption | null = null) {
  return OPTION_LETTERS.filter(
    (letter) => letter === current?.letter || !options.some((option) => option.letter === letter),
  );
}
// A questão é classificada por assunto OU por disciplina: o assunto já determina a disciplina.
export function classifyQuestion(subjectId: number | null, topicId: number | null) {
  return topicId ? { topicId, subjectId: null } : { topicId: null, subjectId };
}
export function classificationLabel(question: Pick<AdminQuestion, 'topic' | 'subject'>) {
  const subject = questionSubject(question);
  return [subject?.description, question.topic?.description].filter(Boolean).join(' · ');
}
