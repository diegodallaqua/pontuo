import { ArrowUpRight, Clock3, FileText } from 'lucide-react';
import { Link } from 'react-router';
import { formatAccuracy, formatDate } from '../../../shared/lib/date';
import { mockExamStatus, statusLabels, type MockExam } from '../domain/mock-exam';

export function MockExamList({ mockExams }: { mockExams: MockExam[] }) {
  return (
    <div className="exam-list">
      {mockExams.map((mockExam) => {
        const status = mockExamStatus(mockExam);
        return (
          <Link
            key={mockExam.id}
            className="exam-row"
            to={`/simulados/${mockExam.id}/${status === 'finished' ? 'resultado' : 'execucao'}`}
          >
            <span className={`exam-row-icon ${status === 'finished' ? '' : 'exam-row-active'}`}>
              <FileText size={21} />
            </span>
            <div className="exam-row-title">
              <strong>{mockExam.name}</strong>
              <span>
                {formatDate(mockExam.createdAt, true)}
                <span>·</span>
                {mockExam.numQuestions} questões<span>·</span>
                <Clock3 size={12} />
                {mockExam.maxTime} min
              </span>
            </div>
            <span className={`status-badge status-${status}`}>{statusLabels[status]}</span>
            <strong className="exam-row-score">{formatAccuracy(mockExam.accuracy)}</strong>
            <ArrowUpRight size={18} className="muted" />
          </Link>
        );
      })}
    </div>
  );
}
