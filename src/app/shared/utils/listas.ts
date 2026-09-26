// 🧰 Utilidades pequeñas que comparten las listas con buscador y filtros de los popups
// de selección (armas y armaduras).

// Añade el valor a la lista si no estaba, o lo quita si ya estaba
export function alternar<T>(lista: readonly T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor];
}

// Cuántos elementos tienen cada valor de la clave. La clave puede devolver varios valores
// (p. ej. todas las habilidades de una pieza): el elemento cuenta una vez en cada uno.
export function contar<T, K>(elementos: readonly T[], clave: (elemento: T) => K | readonly K[]): Map<K, number> {
  const conteo = new Map<K, number>();
  for (const elemento of elementos) {
    const valores = clave(elemento);
    for (const k of new Set(Array.isArray(valores) ? valores : [valores as K])) {
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }
  }
  return conteo;
}

// Texto preparado para buscar sin distinguir mayúsculas ni tildes
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
