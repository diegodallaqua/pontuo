import { useState } from 'react';
import { isSafeImageUrl, type QuestionImage } from '../../catalog/domain/catalog';

export function QuestionFigure({ image }: { image: QuestionImage }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure>
      {isSafeImageUrl(image.url) && !failed ? (
        <img
          src={image.url}
          alt={image.subtitle || 'Imagem que integra o enunciado da questão'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="notice" role="status">
          A imagem desta questão não pôde ser carregada.
        </div>
      )}
      {image.subtitle && <figcaption>{image.subtitle}</figcaption>}
    </figure>
  );
}
