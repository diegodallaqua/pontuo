import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useServices } from '../../../app/services';
import { ApiError } from '../../../shared/lib/http';
import { parseApiDate } from '../../../shared/lib/date';
import type { MockExamSession } from '../domain/mock-exam';

export function useExamRunner(initial: MockExamSession, reload: () => void) {
  const { mockExams } = useServices();
  const navigate = useNavigate();
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [now, setNow] = useState(Date.now);
  const operation = useRef(false);
  const autoFinishAttempted = useRef(false);
  const exam = session.mockExam;
  const deadline = exam.startedAt
    ? parseApiDate(exam.startedAt).getTime() + exam.maxTime * 60_000
    : null;
  const remaining =
    deadline === null ? exam.maxTime * 60 : Math.max(0, Math.ceil((deadline - now) / 1000));
  const expired = deadline !== null && remaining === 0;
  useEffect(() => {
    if (!exam.startedAt) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [exam.startedAt]);
  useEffect(() => {
    if (!saving && !busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saving, busy]);
  const handleFailure = useCallback(
    (failure: unknown) => {
      setError(failure);
      if (failure instanceof ApiError && failure.status === 409) reload();
    },
    [reload],
  );
  async function start() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      const mockExam = await mockExams.start(exam.id);
      setSession((current) => ({ ...current, mockExam }));
      setNow(Date.now());
    } catch (failure) {
      handleFailure(failure);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function answer(answerOptionId: number | null) {
    const link = session.questions[index];
    if (!link || !exam.startedAt || expired || operation.current) return;
    // Uma gravação por vez. A seleção só é confirmada depois do servidor.
    operation.current = true;
    setSaving(true);
    setError(null);
    try {
      const saved = await mockExams.saveAnswer(exam.id, link, answerOptionId);
      setSession((current) => ({
        ...current,
        questions: current.questions.map((item) => (item.id === saved.id ? saved : item)),
      }));
    } catch (failure) {
      handleFailure(failure);
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }
  const finish = useCallback(async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      await mockExams.finish(exam.id);
      navigate(`/simulados/${exam.id}/resultado`, { replace: true });
    } catch (failure) {
      handleFailure(failure);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }, [mockExams, exam.id, navigate, handleFailure]);
  useEffect(() => {
    if (expired && !saving && !busy && !autoFinishAttempted.current) {
      autoFinishAttempted.current = true;
      void finish();
    }
  }, [expired, saving, busy, finish]);
  return {
    session,
    index,
    setIndex,
    saving,
    busy,
    error,
    remaining,
    expired,
    start,
    answer,
    finish,
  };
}
