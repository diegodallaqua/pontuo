import { expect, test } from '@playwright/test';
import { mockAdminApi } from './admin-api';
import { mockContractApi } from './contract-api';

const browserErrors = new WeakMap<object, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test('estudante não vê a administração e volta ao início', async ({ page }) => {
  await mockContractApi(page);
  await page.goto('/admin/questoes');
  await expect(page).toHaveURL(/:5173\/$/);
  await expect(page.getByRole('navigation', { name: 'Administração' })).toHaveCount(0);
});

test('administra áreas com busca no servidor, edição e exclusão protegida', async ({ page }) => {
  const state = await mockAdminApi(page);
  await page.goto('/admin');
  const adminNavigation = page.getByRole('navigation', { name: 'Administração' });
  await expect(adminNavigation).toBeVisible();
  await expect(page.locator('.admin-stat-link').first()).toContainText(/Questões\s*1/);
  await adminNavigation.getByRole('link', { name: 'Catálogo' }).click();
  await expect(page).toHaveURL(/\/admin\/catalogo\/areas$/);
  await page.getByRole('button', { name: 'Nova área' }).click();
  await page.getByRole('dialog').getByLabel('Descrição').fill('Linguagens e Códigos');
  await page.getByRole('button', { name: 'Cadastrar área' }).click();
  await expect(page.getByText('Área cadastrada.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Linguagens e Códigos', exact: true })).toBeVisible();

  await page.getByLabel('Buscar área').fill('linguagens');
  await expect(page.getByRole('row')).toHaveCount(2);
  expect(state.requests.at(-1)?.query).toMatchObject({ search: 'linguagens', page: '1' });

  await page.getByRole('button', { name: 'Editar Linguagens e Códigos' }).click();
  await page.getByRole('dialog').getByLabel('Descrição').fill('Linguagens e suas Tecnologias');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Área atualizada.')).toBeVisible();

  await page.getByLabel('Buscar área').fill('');
  await page.getByRole('button', { name: 'Excluir Matemática e suas Tecnologias' }).click();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('em uso');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Excluir Linguagens e suas Tecnologias' }).click();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByText('Registro excluído.')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(3);
});

test('cadastra a instituição com endereço próprio e cidade buscada no estado', async ({ page }) => {
  const state = await mockAdminApi(page);
  await page.goto('/admin/catalogo/instituicoes');
  await page.getByRole('button', { name: 'Nova instituição' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome').fill('Comissão Permanente do Vestibular da UFSC');
  await dialog.getByLabel('Sigla').fill('COPERVE');
  await dialog.getByLabel('Logradouro').fill('Campus Universitário');
  await dialog.getByLabel('Número').fill('1');
  await dialog.getByLabel('Bairro').fill('Trindade');
  await dialog.getByLabel('Estado').selectOption({ label: 'Santa Catarina' });
  await dialog.getByLabel('Cidade').fill('florianopolis');
  await expect(dialog.locator('input[name="cityId"]')).toHaveValue('1');
  await dialog.getByRole('button', { name: 'Cadastrar instituição' }).click();
  await expect(page.getByText('Instituição cadastrada.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Florianópolis · Santa Catarina' })).toBeVisible();
  const writes = state.requests.filter((request) => request.method === 'POST');
  expect(writes.map((request) => request.path)).toEqual(['/addresses', '/institutions']);
  expect(writes[0]?.body).toEqual({
    street: 'Campus Universitário',
    number: 1,
    neighborhood: 'Trindade',
    complement: null,
    cityId: 1,
  });
  expect(writes[1]?.body).toEqual({
    name: 'Comissão Permanente do Vestibular da UFSC',
    acronym: 'COPERVE',
    addressId: 100,
  });
});

test('cria a questão, transfere o gabarito e cadastra imagem', async ({ page }) => {
  const state = await mockAdminApi(page);
  await page.goto('/admin/questoes');
  await expect(page.getByRole('cell', { name: /Quanto é 2 \+ 2\?/ })).toBeVisible();
  await page.getByRole('link', { name: 'Nova questão' }).first().click();
  await expect(page.getByRole('heading', { name: 'Nova questão' })).toBeVisible();
  await page.getByLabel('Enunciado', { exact: true }).fill('Qual organela realiza a fotossíntese?');
  await page
    .getByLabel('Vestibular de origem')
    .selectOption({ label: 'Vestibular FUVEST (USP) · 2026 · 1ª Fase' });
  await page.getByRole('button', { name: 'Difícil' }).click();
  await page.getByLabel('Área de conhecimento').selectOption({ label: 'Ciências da Natureza' });
  await page.getByLabel(/^Disciplina/).selectOption({ label: 'Biologia' });
  await page.getByRole('button', { name: 'Criar questão' }).click();
  await expect(page).toHaveURL(/\/admin\/questoes\/100$/);
  await expect(page.getByText('Questão criada.', { exact: false })).toBeVisible();
  expect(
    state.requests.find((request) => request.path === '/questions' && request.method === 'POST')
      ?.body,
  ).toEqual({
    statement: 'Qual organela realiza a fotossíntese?',
    explanation: null,
    difficulty: 3,
    entranceExamId: 1,
    topicId: null,
    subjectId: 2,
  });
  await expect(page.getByText('pelo menos duas alternativas')).toBeVisible();

  for (const [text, right] of [
    ['Cloroplasto', true],
    ['Mitocôndria', false],
  ] as const) {
    await page.getByRole('button', { name: 'Adicionar' }).first().click();
    await page.getByRole('dialog').getByLabel('Texto').fill(text);
    if (right) await page.getByLabel('Esta é a alternativa correta').check();
    await page.getByRole('button', { name: 'Cadastrar alternativa' }).click();
    await expect(page.getByText('Alternativa cadastrada.')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Marcar como correta' }).click();
  await expect(page.getByText('Alternativa B marcada como correta.')).toBeVisible();
  const answerKey = state.requests.filter((request) => request.path.startsWith('/answer-options/'));
  expect(answerKey.map((request) => [request.path, request.body?.rightAnswer])).toEqual([
    ['/answer-options/101', false],
    ['/answer-options/102', true],
  ]);

  await page.getByRole('button', { name: 'Adicionar' }).nth(1).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Endereço da imagem').fill('javascript:alert(1)');
  await dialog.getByRole('button', { name: 'Cadastrar imagem' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Endereço da imagem').fill('/imagens/celula.png');
  await dialog.getByLabel('Legenda').fill('Célula vegetal');
  await dialog.getByRole('button', { name: 'Cadastrar imagem' }).click();
  await expect(page.getByText('Imagem cadastrada.')).toBeVisible();
  await expect(page.getByText('Célula vegetal')).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar' }).nth(1).click();
  await dialog.getByLabel('Arquivo da imagem').setInputFiles({
    name: 'cloroplasto.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(dialog.getByLabel('Endereço da imagem')).toBeDisabled();
  await dialog.getByLabel('Legenda').fill('Cloroplasto ampliado');
  await dialog.getByRole('button', { name: 'Cadastrar imagem' }).click();
  await expect(page.getByText('Cloroplasto ampliado')).toBeVisible();
  const signing = state.requests.find((request) => request.path === '/question-images/upload-url');
  expect(signing?.body).toEqual({ contentType: 'image/png', size: 70 });
  expect(state.uploads).toEqual([
    {
      url: expect.stringMatching(/X-Amz-Signature=teste$/),
      contentType: 'image/png',
      size: 70,
    },
  ]);
  const uploaded = state.resources['/question-images']!.rows.at(-1);
  expect(uploaded).toMatchObject({
    url: expect.stringMatching(/^https:\/\/imagens\.example\.test\/questoes\/\d+\.png$/),
    subtitle: 'Cloroplasto ampliado',
  });
  await expect(page.locator(`img[src="${uploaded!.url}"]`)).toBeVisible();
  await page.screenshot({ path: '.artifacts/admin-question-desktop.png', fullPage: true });
});

test('tabela administrativa vira cartões no celular sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdminApi(page);
  await page.goto('/admin/catalogo/disciplinas');
  await expect(page.getByText('Biologia', { exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: '.artifacts/admin-catalog-mobile.png', fullPage: true });
});
