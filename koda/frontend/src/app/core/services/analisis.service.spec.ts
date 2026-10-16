import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnalisisService, aPorcentajes } from './analisis.service';
import { environment } from '../../../environments/environment';

describe('AnalisisService & aPorcentajes', () => {
  let service: AnalisisService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalisisService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AnalisisService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('aPorcentajes (Método de Hamilton)', () => {
    it('debe repartir porcentajes sumando exactamente 100', () => {
      const probabilidades = [0.04, 0.06, 0.55, 0.30, 0.05];
      const resultado = aPorcentajes(probabilidades);

      expect(resultado.reduce((a, b) => a + b, 0)).toBe(100);
      expect(resultado).toEqual([4, 6, 55, 30, 5]);
    });

    it('debe ajustar restos decimales para que nunca sume 99 ni 101', () => {
      // 33.333% cada uno: piso 33 + 33 + 33 = 99. Hamilton asigna el faltante al mayor resto.
      const probabilidades = [1 / 3, 1 / 3, 1 / 3];
      const resultado = aPorcentajes(probabilidades);

      expect(resultado.reduce((a, b) => a + b, 0)).toBe(100);
      expect(resultado).toEqual([34, 33, 33]);
    });
  });

  describe('AnalisisService', () => {
    it('debe iniciar con el catálogo de demostración precargado', () => {
      const lista = service.analisis();
      expect(lista.length).toBe(8);
      expect(lista[0].id).toBe('KL-8820');
      expect(service.total()).toBe(142);
    });

    it('debe retornar un análisis existente por su ID', (done) => {
      service.obtener('KL-8820').subscribe((item) => {
        expect(item).not.toBeNull();
        expect(item?.archivo).toBe('rx_000820.png');
        done();
      });
    });

    it('debe retornar null para un ID inexistente', (done) => {
      service.obtener('KL-INEXISTENTE').subscribe((item) => {
        expect(item).toBeNull();
        done();
      });
    });
  });
});
