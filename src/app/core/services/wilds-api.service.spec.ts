import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { WildsApiService } from './wilds-api.service';

describe('WildsApiService', () => {
  let servicio: WildsApiService;
  let httpMock: HttpTestingController;

  function crear(): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    servicio = TestBed.inject(WildsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => httpMock.verify());

  it('pide solo las armas del tipo indicado y solo los campos que usa la app', () => {
    crear();
    servicio.getWeaponsPorTipo('long-sword', 'es').subscribe();

    const peticion = httpMock.expectOne(req => req.url.endsWith('/es/weapons'));
    expect(JSON.parse(peticion.request.params.get('q')!)).toEqual({ kind: 'long-sword' });
    expect(Object.keys(JSON.parse(peticion.request.params.get('p')!)).sort()).toEqual(
      ['affinity', 'damage', 'id', 'kind', 'name', 'rarity', 'slots', 'specials']);
    peticion.flush([]);
  });

  it('cachea cada tipo por separado: la segunda vez no vuelve a llamar a la API', () => {
    crear();
    servicio.getWeaponsPorTipo('bow', 'es').subscribe();
    httpMock.expectOne(req => req.url.endsWith('/es/weapons')).flush([]);

    servicio.getWeaponsPorTipo('bow', 'es').subscribe();
    httpMock.expectNone(req => req.url.endsWith('/weapons'));
    expect(localStorage.getItem('mhwb:cache:weapons-bow:es')).toEqual('[]');
  });

  it('borra al arrancar la caché antigua del catálogo completo de armas', () => {
    localStorage.setItem('mhwb:cache:weapons:es', '[]');
    localStorage.setItem('mhwb:cache:armor:es', '[]');
    crear();

    expect(localStorage.getItem('mhwb:cache:weapons:es')).toBeNull();
    expect(localStorage.getItem('mhwb:cache:armor:es')).toEqual('[]');
  });
});
