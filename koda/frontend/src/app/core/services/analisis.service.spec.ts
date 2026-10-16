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
    it('debe cargar el historial desde GET /analisis y transformar a Analisis', () => {
      service.cargarHistorial().subscribe((lista) => {
        expect(lista.length).toBe(1);
        expect(lista[0].id).toBe('KL-88');
        expect(lista[0].archivo).toBe('rx_88.png');
        expect(lista[0].confianza).toBe(80);
      });

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/analisis`);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          analisisId: 88,
          fechaAnalisis: '2026-10-15T10:30:00',
          nombreArchivo: 'rx_88.png',
          gradoKL: 2,
          confianza: 0.8,
          probabilidades: [0.05, 0.05, 0.8, 0.05, 0.05],
          modelo: 'diko_stage2',
          tiempoProcesamientoMs: 420,
          imagenDisponible: false,
          imagenExpiraEn: null
        }
      ]);

      expect(service.total()).toBe(1);
    });

    it('debe retornar null para un ID con formato inválido sin hacer petición HTTP', (done) => {
      service.obtener('KL-INEXISTENTE').subscribe((item) => {
        expect(item).toBeNull();
        done();
      });
    });

    it('debe eliminar la imagen de un análisis mediante DELETE /analisis/{id}/imagen', () => {
      service.eliminarImagen('KL-88').subscribe();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/analisis/88/imagen`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
