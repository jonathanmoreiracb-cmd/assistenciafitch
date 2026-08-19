/**
  Regra de Comissão por Volume de O.S. Particulares (Fitch Tecnologia):
  - O.S. de Garantia da Loja: R$ 0,00 de comissão.
  - 1 a 10 O.S. Particulares concluídas: R$ 20,00 por O.S.
  - 11 a 20 O.S. Particulares concluídas: R$ 30,00 por O.S.
  - 21 a 30 O.S. Particulares concluídas: R$ 40,00 por O.S.
  - 31+ O.S. Particulares concluídas: R$ 50,00 por O.S. (Valor Máximo)
*/
export function calcularComissaoVolume(osParticularesConcluidas: number) {
  let valorPorOS = 20;
  let faixaLabel = 'R$ 20,00 / O.S. (1 a 10 un)';

  if (osParticularesConcluidas >= 31) {
    valorPorOS = 50;
    faixaLabel = 'R$ 50,00 / O.S. (31+ un - Nível Máximo)';
  } else if (osParticularesConcluidas >= 21) {
    valorPorOS = 40;
    faixaLabel = 'R$ 40,00 / O.S. (21 a 30 un)';
  } else if (osParticularesConcluidas >= 11) {
    valorPorOS = 30;
    faixaLabel = 'R$ 30,00 / O.S. (11 a 20 un)';
  }

  const comissaoTotal = osParticularesConcluidas * valorPorOS;

  return {
    valorPorOS,
    faixaLabel,
    comissaoTotal,
  };
}
