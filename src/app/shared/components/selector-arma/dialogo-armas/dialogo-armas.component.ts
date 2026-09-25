import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { TranslatePipe } from '@ngx-translate/core';
import { Weapon } from '../../../../core/models/wilds.models';
import { DatosDialogoArmas, TIPOS_ARMA, iconoTipoArma } from '../../../models/tipos-arma.models';

// Alto fijo (px) de cada fila de la lista: el scroll virtual lo necesita para calcular
// qué filas pintar. Debe coincidir con la altura de ".fila-arma" en el SCSS.
export const ALTO_FILA_ARMA = 64;

// 🗡️ Popup de selección de armas, en dos pantallas:
//   1. Rejilla con la imagen de cada tipo de arma.
//   2. Buscador + lista (con scroll virtual) de las armas del tipo elegido.
// Al elegir un arma el popup se cierra devolviéndola; si se cierra de cualquier otra
// forma (X, Escape, click fuera) devuelve `undefined` y la selección no cambia.
@Component({
  selector: 'app-dialogo-armas',
  standalone: true,
  imports: [ScrollingModule, TranslatePipe],
  templateUrl: './dialogo-armas.component.html',
  styleUrl: './dialogo-armas.component.scss'
})
export class DialogoArmasComponent {
  private readonly datos = inject<DatosDialogoArmas>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<DialogoArmasComponent, Weapon>>(MatDialogRef);
  private readonly injector = inject(Injector);

  readonly tipos = TIPOS_ARMA;
  readonly iconoTipo = iconoTipoArma;
  readonly altoFila = ALTO_FILA_ARMA;
  readonly seleccionada = this.datos.seleccionada;

  // null = pantalla 1 (tipos). Si ya había un arma elegida, se abre directamente en la
  // lista de su tipo (con el botón de volver disponible para cambiar de tipo).
  readonly tipoElegido = signal<string | null>(this.datos.seleccionada?.kind ?? null);
  readonly textoBusqueda = signal('');

  private readonly viewport = viewChild(CdkVirtualScrollViewport);
  private readonly campoBusqueda = viewChild<ElementRef<HTMLInputElement>>('campoBusqueda');

  // Armas del tipo elegido que coinciden con el buscador (sin distinguir mayúsculas ni tildes)
  readonly armasFiltradas = computed<Weapon[]>(() => {
    const tipo = this.tipoElegido();
    if (!tipo) return [];

    const texto = normalizar(this.textoBusqueda().trim());
    return this.datos.armas.filter(arma =>
      arma.kind === tipo && (!texto || normalizar(arma.name).includes(texto)));
  });

  constructor() {
    // Al abrir directamente en la lista, se desplaza hasta el arma ya elegida. Se espera a
    // que el popup termine de abrirse: antes, el scroll virtual aún no conoce su altura
    // total y el desplazamiento se queda en 0.
    this.dialogRef.afterOpened().subscribe(() => this.prepararLista(true));
  }

  // Identidad estable de cada fila para el scroll virtual
  readonly porId = (_indice: number, arma: Weapon) => arma.id;

  elegirTipo(tipo: string): void {
    this.textoBusqueda.set('');
    this.tipoElegido.set(tipo);
    // La lista y el buscador aún no existen hasta el siguiente render
    afterNextRender(() => this.prepararLista(false), { injector: this.injector });
  }

  volverATipos(): void {
    this.textoBusqueda.set('');
    this.tipoElegido.set(null);
  }

  onBusquedaInput(texto: string): void {
    this.textoBusqueda.set(texto);
    this.viewport()?.scrollToIndex(0);
  }

  elegirArma(arma: Weapon): void {
    this.dialogRef.close(arma);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  // Tras mostrar la lista: recalcula su tamaño (el popup termina de animarse después de
  // crearse), la desplaza hasta el arma elegida y, solo con ratón, enfoca el buscador
  // (en móvil abriría el teclado tapando media lista nada más entrar).
  private prepararLista(desplazarASeleccionada: boolean): void {
    const viewport = this.viewport();
    if (!viewport) return;

    viewport.checkViewportSize();

    if (desplazarASeleccionada && this.seleccionada) {
      const indice = this.armasFiltradas().findIndex(arma => arma.id === this.seleccionada?.id);
      if (indice > 0) viewport.scrollToIndex(Math.max(0, indice - 2));
    }

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this.campoBusqueda()?.nativeElement.focus();
    }
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
