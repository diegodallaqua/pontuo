import { useCallback, useState } from 'react';
import { ImageOff, ImagePlus, Plus } from 'lucide-react';
import { useServices } from '../../../app/services';
import { useResource } from '../../../shared/hooks/use-resource';
import { Button, ErrorState, Loading } from '../../../shared/ui/components';
import { isSafeImageUrl, type QuestionImage } from '../../catalog/domain/catalog';
import { AnswerKeyLostError, saveAnswerOption } from '../application/save-answer-option';
import { freeLetters, type AnswerKeyOption } from '../domain/admin';
import { RowActions } from './admin-table';
import {
  DeleteDialog,
  FormDialog,
  optionalText,
  RequestError,
  textField,
  type DialogProps,
} from './form-dialog';

type Dialog<T> = { kind: 'form'; item: T | null } | { kind: 'delete'; item: T };

export function AnswerOptionsPanel({ questionId }: { questionId: number }) {
  const { admin } = useServices();
  const resource = useResource(
    useCallback(
      async (signal: AbortSignal) =>
        (await admin.answerOptions.all({ questionId }, signal)).sort((a, b) =>
          a.letter.localeCompare(b.letter),
        ),
      [admin, questionId],
    ),
  );
  const [dialog, setDialog] = useState<Dialog<AnswerKeyOption> | null>(null);
  const [notice, setNotice] = useState('');
  const [marking, setMarking] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const options = resource.data ?? [];
  function finish(message: string) {
    setDialog(null);
    setError(null);
    setNotice(message);
    resource.reload();
  }
  async function markRight(option: AnswerKeyOption) {
    setMarking(option.id);
    setError(null);
    setNotice('');
    try {
      const { letter, text } = option;
      await saveAnswerOption(
        admin.answerOptions,
        options,
        { questionId, letter, text, rightAnswer: true },
        option,
      );
      setNotice(`Alternativa ${option.letter} marcada como correta.`);
    } catch (failure) {
      setError(failure);
    } finally {
      setMarking(null);
      resource.reload();
    }
  }
  const hasRightAnswer = options.some((option) => option.rightAnswer);
  return (
    <section className="panel">
      <div className="section-heading">
        <div className="step-heading">
          <span className="step-number">02</span>
          <div>
            <h2>Alternativas</h2>
            <p className="muted text-small">De A a E, com exatamente uma correta.</p>
          </div>
        </div>
        <Button
          variant="secondary"
          disabled={!resource.data || !freeLetters(options).length}
          onClick={() => setDialog({ kind: 'form', item: null })}
        >
          <Plus size={16} />
          Adicionar
        </Button>
      </div>
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      {error != null && <RequestError error={error} />}
      {resource.loading ? (
        <Loading label="Carregando alternativas…" />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          {(options.length < 2 || !hasRightAnswer) && (
            <div className="notice">
              {options.length < 2
                ? 'A questão precisa de pelo menos duas alternativas para ser usada em simulados.'
                : 'Nenhuma alternativa está marcada como correta: a correção dos simulados depende dela.'}
            </div>
          )}
          <ul className="admin-content-list">
            {options.map((option) => (
              <li key={option.id} className={option.rightAnswer ? 'admin-option-right' : ''}>
                <span className="answer-letter">{option.letter}</span>
                <div className="admin-content-body">
                  <p>{option.text}</p>
                  {option.rightAnswer ? (
                    <span className="status-badge status-finished">Correta</span>
                  ) : (
                    <button
                      className="text-link"
                      disabled={marking !== null}
                      onClick={() => void markRight(option)}
                    >
                      {marking === option.id ? 'Marcando…' : 'Marcar como correta'}
                    </button>
                  )}
                </div>
                <RowActions
                  name={`alternativa ${option.letter}`}
                  onEdit={() => setDialog({ kind: 'form', item: option })}
                  onDelete={() => setDialog({ kind: 'delete', item: option })}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {dialog?.kind === 'form' && (
        <AnswerOptionForm
          item={dialog.item}
          options={options}
          questionId={questionId}
          onClose={() => setDialog(null)}
          onSaved={finish}
          onKeyLost={resource.reload}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteDialog
          title="Excluir esta alternativa?"
          name={`Alternativa ${dialog.item.letter}`}
          warning="Alternativas já marcadas por estudantes em simulados não podem ser excluídas."
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await admin.answerOptions.remove(dialog.item.id);
            finish('Alternativa excluída.');
          }}
        />
      )}
    </section>
  );
}
function AnswerOptionForm({
  item,
  options,
  questionId,
  onClose,
  onSaved,
  onKeyLost,
}: DialogProps<AnswerKeyOption> & {
  options: AnswerKeyOption[];
  questionId: number;
  onKeyLost: () => void;
}) {
  const { admin } = useServices();
  const letters = freeLetters(options, item);
  const current = options.find((option) => option.rightAnswer && option.id !== item?.id);
  return (
    <FormDialog
      title={item ? `Editar alternativa ${item.letter}` : 'Nova alternativa'}
      submitLabel={item ? 'Salvar alterações' : 'Cadastrar alternativa'}
      onClose={onClose}
      onSubmit={async (data) => {
        const input = {
          questionId,
          letter: textField(data, 'letter'),
          text: textField(data, 'text'),
          rightAnswer: data.get('rightAnswer') === 'on',
        };
        try {
          await saveAnswerOption(admin.answerOptions, options, input, item);
        } catch (failure) {
          // O gabarito anterior foi desmarcado e não voltou: a lista precisa refletir o servidor.
          if (failure instanceof AnswerKeyLostError) onKeyLost();
          throw failure;
        }
        onSaved(item ? 'Alternativa atualizada.' : 'Alternativa cadastrada.');
      }}
    >
      <label>
        Letra
        <select name="letter" defaultValue={item?.letter ?? letters[0]} required>
          {letters.map((letter) => (
            <option key={letter}>{letter}</option>
          ))}
        </select>
      </label>
      <label>
        Texto
        <textarea name="text" rows={4} defaultValue={item?.text} required />
      </label>
      <label className="admin-check">
        <input type="checkbox" name="rightAnswer" defaultChecked={item?.rightAnswer ?? false} />
        Esta é a alternativa correta
      </label>
      {current && (
        <p className="muted text-small">
          Hoje a correta é a {current.letter}. Marcar esta transfere o gabarito.
        </p>
      )}
    </FormDialog>
  );
}

export function QuestionImagesPanel({ questionId }: { questionId: number }) {
  const { admin } = useServices();
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) => admin.questionImages.all({ questionId }, signal),
      [admin, questionId],
    ),
  );
  const [dialog, setDialog] = useState<Dialog<QuestionImage> | null>(null);
  const [notice, setNotice] = useState('');
  function finish(message: string) {
    setDialog(null);
    setNotice(message);
    resource.reload();
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <div className="step-heading">
          <span className="step-number">03</span>
          <div>
            <h2>Imagens</h2>
            <p className="muted text-small">Figuras, gráficos ou tabelas do enunciado.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setDialog({ kind: 'form', item: null })}>
          <ImagePlus size={16} />
          Adicionar
        </Button>
      </div>
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      {resource.loading ? (
        <Loading label="Carregando imagens…" />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : !resource.data?.length ? (
        <p className="muted text-small">Esta questão não tem imagens.</p>
      ) : (
        <ul className="admin-content-list">
          {resource.data.map((image) => (
            <li key={image.id}>
              <ImagePreview url={image.url} />
              <div className="admin-content-body">
                <p>{image.subtitle || 'Sem legenda'}</p>
                <small className="muted admin-url">{image.url}</small>
              </div>
              <RowActions
                name={`imagem ${image.subtitle || image.id}`}
                onEdit={() => setDialog({ kind: 'form', item: image })}
                onDelete={() => setDialog({ kind: 'delete', item: image })}
              />
            </li>
          ))}
        </ul>
      )}
      {dialog?.kind === 'form' && (
        <QuestionImageForm
          item={dialog.item}
          questionId={questionId}
          onClose={() => setDialog(null)}
          onSaved={finish}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteDialog
          title="Excluir esta imagem?"
          name={dialog.item.subtitle || dialog.item.url}
          warning="A imagem deixa de aparecer no enunciado, inclusive em simulados em andamento."
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await admin.questionImages.remove(dialog.item.id);
            finish('Imagem excluída.');
          }}
        />
      )}
    </section>
  );
}
function ImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="admin-thumb">
      {isSafeImageUrl(url) && !failed ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff size={20} aria-label="Pré-visualização indisponível" />
      )}
    </span>
  );
}
function QuestionImageForm({
  item,
  questionId,
  onClose,
  onSaved,
}: DialogProps<QuestionImage> & { questionId: number }) {
  const { admin } = useServices();
  return (
    <FormDialog
      title={item ? 'Editar imagem' : 'Nova imagem'}
      submitLabel={item ? 'Salvar alterações' : 'Cadastrar imagem'}
      onClose={onClose}
      onSubmit={async (data) => {
        await admin.questionImages.save(item?.id ?? null, {
          questionId,
          url: textField(data, 'url'),
          subtitle: optionalText(data, 'subtitle'),
        });
        onSaved(item ? 'Imagem atualizada.' : 'Imagem cadastrada.');
      }}
    >
      <label>
        Endereço da imagem
        <input
          name="url"
          inputMode="url"
          defaultValue={item?.url}
          maxLength={255}
          required
          pattern="(https?://|/(?!/)).+"
          title="Use um endereço http(s) ou um caminho que comece com /."
          placeholder="https://…"
        />
        <small>Endereços http(s) ou caminhos do próprio site, como /imagens/grafico.png.</small>
      </label>
      <label>
        Legenda
        <input
          name="subtitle"
          defaultValue={item?.subtitle ?? ''}
          maxLength={255}
          placeholder="Opcional. Também usada como texto alternativo."
        />
      </label>
    </FormDialog>
  );
}
