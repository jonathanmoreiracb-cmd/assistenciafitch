/**
  Regra de Gratificação por Assistência Particular Negociada (Fitch Tecnologia):
  - O.S. de Garantia da Loja / Revisão: R$ 0,00 de gratificação.
  - Até 5 O.S. Particulares concluídas: R$ 20,00 por O.S.
  - 6 O.S. Particulares concluídas: R$ 30,00 por O.S.
  - 7 a 8 O.S. Particulares concluídas: R$ 40,00 por O.S.
  - Acima de 8 (9+) O.S. Particulares concluídas: R$ 50,00 por O.S. (Nível Máximo)
*/
export function calcularComissaoVolume(osParticularesConcluidas: number) {
  let valorPorOS = 20;
  let faixaLabel = 'R$ 20,00 / O.S. (Até 5 un)';

  if (osParticularesConcluidas >= 9) {
    valorPorOS = 50;
    faixaLabel = 'R$ 50,00 / O.S. (Acima de 8 un - Nível Máximo)';
  } else if (osParticularesConcluidas >= 7) {
    valorPorOS = 40;
    faixaLabel = 'R$ 40,00 / O.S. (7 a 8 un)';
  } else if (osParticularesConcluidas === 6) {
    valorPorOS = 30;
    faixaLabel = 'R$ 30,00 / O.S. (6 un)';
  }

  const comissaoTotal = osParticularesConcluidas * valorPorOS;

  return {
    valorPorOS,
    faixaLabel,
    comissaoTotal,
  };
}
