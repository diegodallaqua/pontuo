import { ApiError } from '../../../shared/lib/http';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type QuestionImageUpload,
  type QuestionImageUploadInput,
} from '../domain/admin';

export interface ImageUploadGateway {
  uploadUrl: (body: QuestionImageUploadInput) => Promise<QuestionImageUpload>;
}

// Envia o arquivo direto ao armazenamento por uma URL assinada e devolve o endereço público.
// Tipo e tamanho entram na assinatura: o arquivo vai puro no corpo, sem FormData, para o
// navegador mandar exatamente o Content-Length que foi assinado.
export async function uploadQuestionImage(
  gateway: ImageUploadGateway,
  file: File,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Use uma imagem PNG, JPEG, WebP ou GIF.');
  if (file.size === 0) throw new Error('O arquivo da imagem está vazio.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem precisa ter até 5 MB.');
  const upload = await gateway.uploadUrl({ contentType: file.type, size: file.size });
  let response: Response;
  try {
    response = await fetcher(upload.uploadUrl, {
      method: 'PUT',
      headers: upload.headers,
      body: file,
      signal: AbortSignal.timeout(120_000),
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(
      'Não foi possível enviar a imagem. Verifique sua conexão e tente novamente.',
    );
  }
  if (!response.ok) {
    throw new ApiError(
      'O armazenamento recusou a imagem. Tente enviar novamente.',
      response.status,
    );
  }
  return upload.url;
}
