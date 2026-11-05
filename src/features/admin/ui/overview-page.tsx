import { useCallback } from 'react';
import { Link } from 'react-router';
import {
  BookOpen,
  FileQuestionMark,
  GraduationCap,
  Landmark,
  Layers,
  Plus,
  RotateCcw,
  Tags,
} from 'lucide-react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import { errorMessage, type Query } from '../../../shared/lib/http';
import type { Page } from '../../../shared/lib/pagination';
import { Button, ErrorBanner, PageHeader, StatCard } from '../../../shared/ui/components';

const shortcuts = [
  {
    resource: 'questions',
    label: 'Questões',
    detail: 'Enunciados, gabaritos e imagens',
    to: '/admin/questoes',
    icon: FileQuestionMark,
  },
  {
    resource: 'entranceExams',
    label: 'Vestibulares',
    detail: 'Provas de origem das questões',
    to: '/admin/catalogo/vestibulares',
    icon: GraduationCap,
  },
  {
    resource: 'institutions',
    label: 'Instituições',
    detail: 'Organizadoras dos vestibulares',
    to: '/admin/catalogo/instituicoes',
    icon: Landmark,
  },
  {
    resource: 'knowledgeAreas',
    label: 'Áreas',
    detail: 'Grandes áreas do conhecimento',
    to: '/admin/catalogo/areas',
    icon: Layers,
  },
  {
    resource: 'subjects',
    label: 'Disciplinas',
    detail: 'Matérias de cada área',
    to: '/admin/catalogo/disciplinas',
    icon: BookOpen,
  },
  {
    resource: 'topics',
    label: 'Assuntos',
    detail: 'Recortes de cada disciplina',
    to: '/admin/catalogo/assuntos',
    icon: Tags,
  },
] as const;

// Uma página de um registro basta: o total vem no envelope da paginação.
async function count(
  resource: { list: (query: Query, signal?: AbortSignal) => Promise<Page<unknown>> },
  signal: AbortSignal,
) {
  return (await resource.list({ limit: 1 }, signal)).totalElements;
}

export function AdminOverviewPage() {
  const { admin } = useServices();
  const counts = useResource(
    useCallback(
      (signal: AbortSignal) =>
        Promise.all(shortcuts.map(({ resource }) => count(admin[resource], signal))),
      [admin],
    ),
  );
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRAÇÃO"
        title="O conteúdo da Pontuo passa por aqui."
        description="Cadastre, revise e organize o que os estudantes encontram nos simulados."
        action={
          <Link className="button button-primary" to="/admin/questoes/nova">
            <Plus size={17} />
            Nova questão
          </Link>
        }
      />
      {counts.error != null && (
        <ErrorBanner>
          {errorMessage(counts.error)}
          <p>
            <Button variant="secondary" onClick={counts.reload}>
              <RotateCcw size={16} />
              Tentar novamente
            </Button>
          </p>
        </ErrorBanner>
      )}
      <div className="admin-stats">
        {shortcuts.map(({ resource, label, detail, to, icon: Icon }, index) => (
          <Link className="admin-stat-link" to={to} key={resource} aria-busy={counts.loading}>
            <StatCard
              label={label}
              value={counts.data?.[index] ?? '—'}
              detail={detail}
              icon={<Icon size={18} />}
              tone={resource === 'questions' ? 'stat-highlight' : ''}
            />
          </Link>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Como o conteúdo se organiza</h2>
            <p className="muted text-small">
              Cada etapa depende da anterior. Registros em uso não podem ser excluídos.
            </p>
          </div>
        </div>
        <ol className="admin-guide">
          <li>
            <span className="step-number">01</span>
            <div>
              <h3>Classifique</h3>
              <p>
                Áreas reúnem disciplinas, e disciplinas reúnem assuntos. É essa estrutura que o
                estudante usa para filtrar o simulado e acompanhar o desempenho.
              </p>
            </div>
          </li>
          <li>
            <span className="step-number">02</span>
            <div>
              <h3>Indique a origem</h3>
              <p>Cada vestibular pertence a uma instituição, com ano e etapa da prova.</p>
            </div>
          </li>
          <li>
            <span className="step-number">03</span>
            <div>
              <h3>Publique a questão</h3>
              <p>
                Enunciado, classificação e vestibular primeiro; depois as alternativas, com
                exatamente uma correta, e as imagens, quando houver.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </>
  );
}
