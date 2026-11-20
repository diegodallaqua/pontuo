import { describe, expect, it, vi } from 'vitest';
import { uploadQuestionImage, type ImageUploadGateway } from './upload-question-image';
import { MAX_IMAGE_BYTES } from '../domain/admin';

const signed = {
  uploadUrl: 'https://uploads.example.test/questoes/a1.png?X-Amz-Signature=abc',
  headers: { 'Content-Type': 'image/png' },
  url: 'https://imagens.example.test/questoes/a1.png',
  expiresAt: '2026-11-05T13:10:00Z',
};
const png = new File([new Uint8Array([137, 80, 78, 71])], 'grafico.png', { type: 'image/png' });

function gateway() {
  return { uploadUrl: vi.fn(async () => signed) } satisfies ImageUploadGateway;
}

describe('upload de imagens das questões', () => {
  it('assina tipo e tamanho e envia o arquivo puro com os headers devolvidos', async () => {
    const fake = gateway();
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    await expect(uploadQuestionImage(fake, png, fetcher)).resolves.toBe(signed.url);
    expect(fake.uploadUrl).toHaveBeenCalledWith({ contentType: 'image/png', size: 4 });
    expect(fetcher).toHaveBeenCalledWith(
      signed.uploadUrl,
      expect.objectContaining({ method: 'PUT', headers: signed.headers, body: png }),
    );
  });
  it('recusa formatos fora da assinatura sem pedir URL', async () => {
    const fake = gateway();
    const svg = new File(['<svg/>'], 'grafico.svg', { type: 'image/svg+xml' });
    await expect(uploadQuestionImage(fake, svg, vi.fn())).rejects.toThrow('PNG, JPEG, WebP ou GIF');
    expect(fake.uploadUrl).not.toHaveBeenCalled();
  });
  it('recusa arquivos vazios ou acima de 5 MB sem pedir URL', async () => {
    const fake = gateway();
    const empty = new File([], 'vazio.png', { type: 'image/png' });
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'grande.png', {
      type: 'image/png',
    });
    await expect(uploadQuestionImage(fake, empty, vi.fn())).rejects.toThrow('vazio');
    await expect(uploadQuestionImage(fake, big, vi.fn())).rejects.toThrow('até 5 MB');
    expect(fake.uploadUrl).not.toHaveBeenCalled();
  });
  it('não devolve endereço quando o armazenamento recusa ou a rede falha', async () => {
    const refused = vi.fn(async () => new Response(null, { status: 403 }));
    await expect(uploadQuestionImage(gateway(), png, refused)).rejects.toMatchObject({
      status: 403,
    });
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(uploadQuestionImage(gateway(), png, offline)).rejects.toThrow(
      'Não foi possível enviar a imagem',
    );
  });
});
