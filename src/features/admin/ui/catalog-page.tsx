import { Navigate, NavLink, useParams } from 'react-router';
import { PageHeader } from '../../../shared/ui/components';
import { EntranceExamsSection, InstitutionsSection } from './origin-sections';
import { KnowledgeAreasSection, SubjectsSection, TopicsSection } from './taxonomy-sections';

export const catalogSections = [
  { path: 'areas', label: 'Áreas', Section: KnowledgeAreasSection },
  { path: 'disciplinas', label: 'Disciplinas', Section: SubjectsSection },
  { path: 'assuntos', label: 'Assuntos', Section: TopicsSection },
  { path: 'instituicoes', label: 'Instituições', Section: InstitutionsSection },
  { path: 'vestibulares', label: 'Vestibulares', Section: EntranceExamsSection },
];

export function CatalogAdminPage() {
  const { section } = useParams();
  const current = catalogSections.find((item) => item.path === section);
  if (!current) return <Navigate to="/admin/catalogo/areas" replace />;
  return (
    <>
      <PageHeader
        eyebrow="CATÁLOGO DA PLATAFORMA"
        title="Organize o que os estudantes encontram."
        description="Áreas, disciplinas e assuntos classificam as questões; instituições e vestibulares indicam a origem."
      />
      <nav className="admin-tabs" aria-label="Seções do catálogo">
        {catalogSections.map((item) => (
          <NavLink
            key={item.path}
            to={`/admin/catalogo/${item.path}`}
            className={({ isActive }) => (isActive ? 'tab-active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <current.Section />
    </>
  );
}
