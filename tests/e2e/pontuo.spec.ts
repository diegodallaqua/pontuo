import { expect, test } from '@playwright/test';
import { apiDate, makeExam, mockContractApi } from './contract-api';

const browserErrors = new WeakMap<object, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test('protege as rotas, faz login e mostra um estado vazio real', async ({ page }) => {
  await mockContractApi(page, { authenticated: false });
  await page.goto('/simulados');
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel('Usuário ou e-mail').fill('Mariana');
  await page.getByLabel('Senha', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page).toHaveURL(/\/simulados$/);
  await expect(page.getByRole('heading', { name: 'O primeiro passo é seu.' })).toBeVisible();
});

test('cadastro envia o contrato público sem perfil e direciona ao login', async ({ page }) => {
  const state = await mockContractApi(page, { authenticated: false });
  await page.goto('/cadastro');
  await page.getByLabel('Nome de usuário').fill('Mariana');
  await page.getByLabel('E-mail', { exact: true }).fill('mariana@example.test');
  await page.getByLabel('Data de nascimento').fill('2005-03-12');
  await page.getByLabel('Senha', { exact: true }).fill('password123');
  await page.getByLabel('Confirme sua senha').fill('password123');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Conta criada! Entre com seu usuário ou e-mail.',
  );
  expect(state.requests.find((request) => request.path === '/auth/register')?.body).toEqual({
    username: 'Mariana',
    password: 'password123',
    email: 'mariana@example.test',
    birthDate: '2005-03-12',
  });
});

test('monta, inicia, salva, limpa, retoma pelo servidor e finaliza o simulado', async ({
  page,
}) => {
  const state = await mockContractApi(page);
  await page.goto('/simulados/novo');
  await page.getByLabel('Nome do simulado').fill('Meu treino completo');
  await page.getByLabel('Quantidade de questões').fill('2');
  await page.getByRole('button', { name: 'Preparar simulado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Um momento para se concentrar.' })).toBeVisible();
  expect(state.links).toHaveLength(2);
  await page.getByRole('button', { name: 'Começar simulado' }).click();
  await page.locator('.answer-option').first().click();
  await expect(page.getByText('Resposta salva', { exact: true })).toBeVisible();
  await expect(page.getByText('EXPLICAÇÃO NÃO DEVE APARECER NA PROVA')).toHaveCount(0);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await page.locator('.answer-option').nth(1).click();
  await expect(page.getByText('Resposta salva', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar resposta' }).click();
  await expect(page.getByText('Ainda não respondida')).toBeVisible();
  expect(state.links[1]?.answerOption).toBeNull();
  await page.locator('.answer-option').nth(1).click();
  await expect(page.getByText('Resposta salva', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio').first()).toBeChecked();
  await expect(page.getByText('2 de 2 respondidas')).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar simulado', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar e ver resultado' }).click();
  await expect(page).toHaveURL(/\/resultado$/);
  await expect(page.getByText('50%', { exact: true }).first()).toBeVisible();
  expect(state.finishCalls).toBe(1);
  expect(state.exams[0]?.correctCount).toBe(1);
  await page.screenshot({ path: '.artifacts/result-desktop.png', fullPage: true });
});

test('falha na gravação preserva a seleção confirmada e permite tentar novamente', async ({
  page,
}) => {
  const state = await mockContractApi(page, { exam: makeExam({ startedAt: apiDate() }) });
  state.saveFailures = 1;
  await page.goto('/simulados/100/execucao');
  await page.locator('.answer-option').first().click();
  await expect(page.getByRole('alert')).toContainText('indisponível');
  await expect(page.getByRole('radio').first()).not.toBeChecked();
  await page.locator('.answer-option').first().click();
  await expect(page.getByText('Resposta salva', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeChecked();
});

test('bloqueia finalização e mudanças simultâneas durante gravação', async ({ page }) => {
  const state = await mockContractApi(page, { exam: makeExam({ startedAt: apiDate() }) });
  state.saveDelay = 600;
  await page.goto('/simulados/100/execucao');
  await page.locator('.answer-option').first().click();
  await expect(page.getByText('Salvando resposta…')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Finalizar simulado', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('radio').nth(1)).toBeDisabled();
  await expect(page.getByText('Resposta salva', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finalizar simulado', exact: true })).toBeEnabled();
});

test('retoma uma prova vencida e finaliza automaticamente uma única vez', async ({ page }) => {
  const state = await mockContractApi(page, {
    exam: makeExam({ startedAt: apiDate(Date.now() - 120_000), maxTime: 1 }),
  });
  await page.goto('/simulados/100/execucao');
  await expect(page).toHaveURL(/\/resultado$/);
  await expect(page.getByRole('heading', { name: 'Cada resultado ensina algo.' })).toBeVisible();
  expect(state.finishCalls).toBe(1);
  expect(state.exams[0]?.answeredCount).toBe(0);
});

test('reconcilia o simulado após 409 de outra aba', async ({ page }) => {
  const state = await mockContractApi(page, { exam: makeExam() });
  state.startConflict = true;
  await page.goto('/simulados/100/execucao');
  await page.getByRole('button', { name: 'Começar simulado' }).click();
  await expect(page.getByText('Quanto é 2 + 2?')).toBeVisible();
  expect(state.requests.filter((request) => request.path === '/mock-exams/100/start')).toHaveLength(
    1,
  );
});

test('limpa filtros dependentes e não cria um simulado vazio', async ({ page }) => {
  const state = await mockContractApi(page);
  await page.goto('/simulados/novo?topicId=1');
  await expect(page.getByRole('combobox', { name: 'Disciplina', exact: true })).toHaveValue('1');
  await expect(page.getByRole('combobox', { name: 'Assunto', exact: true })).toHaveValue('1');
  state.emptyCatalog = true;
  await page.getByRole('combobox', { name: 'Área de conhecimento' }).selectOption('2');
  await expect(page.getByRole('combobox', { name: 'Disciplina', exact: true })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Assunto', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Preparar simulado', exact: true })).toBeDisabled();
  expect(
    state.requests.filter((request) => request.path === '/mock-exams' && request.method === 'POST'),
  ).toHaveLength(0);
});

test('edita e exclui pelo histórico com confirmação', async ({ page }) => {
  const state = await mockContractApi(page, { exam: makeExam() });
  await page.goto('/simulados');
  await page.getByRole('button', { name: 'Editar Treino de matemática' }).click();
  await page.getByLabel('Nome do simulado').fill('Treino atualizado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('heading', { name: 'Treino atualizado' })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir Treino atualizado' }).click();
  await expect(page.getByRole('dialog')).toContainText('não pode ser desfeita');
  await page.getByRole('button', { name: 'Excluir simulado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'O primeiro passo é seu.' })).toBeVisible();
  expect(state.exams).toHaveLength(0);
});

test('401 encerra a sessão e mantém o destino para novo login', async ({ page }) => {
  const state = await mockContractApi(page);
  state.unauthorizedPath = '/mock-exams';
  await page.goto('/simulados');
  await expect(page).toHaveURL(/\/entrar$/);
  expect(await page.evaluate(() => sessionStorage.getItem('pontuo.session.v1'))).toBeNull();
});

test('403 não encerra a sessão nem exibe o conteúdo de outro aluno', async ({ page }) => {
  const state = await mockContractApi(page, { exam: makeExam() });
  state.forbiddenPath = '/mock-exams/100';
  await page.goto('/simulados/100/execucao');
  await expect(page.getByRole('alert')).toContainText('não tem permissão');
  await expect(page).toHaveURL(/\/execucao$/);
  expect(await page.evaluate(() => sessionStorage.getItem('pontuo.session.v1'))).not.toBeNull();
});

test('desempenho aplica apenas filtros suportados por cada endpoint', async ({ page }) => {
  const state = await mockContractApi(page, { history: true });
  await page.goto('/desempenho');
  await page.getByLabel('De', { exact: true }).fill('2026-10-01');
  await page.getByLabel('Até', { exact: true }).fill('2026-10-15');
  await page.getByRole('combobox', { name: 'Vestibular', exact: true }).selectOption('1');
  await page.getByRole('combobox', { name: 'Disciplina da evolução' }).selectOption('1');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Por disciplina', exact: true })).toBeVisible();
  const overview = state.requests.filter((request) => request.path.endsWith('/overview')).at(-1)!;
  const evolution = state.requests.filter((request) => request.path.endsWith('/evolution')).at(-1)!;
  const topics = state.requests
    .filter((request) => request.path.endsWith('/topics') && request.path.includes('/performance'))
    .at(-1)!;
  expect(overview.query).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  expect(evolution.query).toEqual({ from: '2026-10-01', to: '2026-10-15', subjectId: '1' });
  expect(topics.query.entranceExamId).toBe('1');
  expect(topics.query.subjectId).toBe('1');
});

test('visão geral e menu funcionam em desktop e celular sem transbordamento', async ({ page }) => {
  await mockContractApi(page, { history: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Vamos avançar, Mariana?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Seus últimos passos' })).toBeVisible();
  await page.screenshot({ path: '.artifacts/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('link', { name: 'Meu desempenho', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.screenshot({ path: '.artifacts/dashboard-mobile.png', fullPage: true });
});

test('login se adapta ao celular e permite revelar a senha pelo teclado', async ({ page }) => {
  await mockContractApi(page, { authenticated: false });
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Seu próximo passo.' })).toBeVisible();
  await page.screenshot({ path: '.artifacts/login-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Senha', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Mostrar senha' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.artifacts/login-mobile.png', fullPage: true });
});

test('logout revoga o token e remove o armazenamento local', async ({ page }) => {
  const state = await mockContractApi(page, { history: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(state.logoutCalls).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('pontuo.session.v1'))).toBeNull();
});
